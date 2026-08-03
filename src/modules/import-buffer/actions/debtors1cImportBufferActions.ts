"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

import { dispatchAdminCommand } from "@/src/modules/content-engine/v2/dispatch";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { assertWorkspaceAction } from "@/src/shared/permissions/actionAccess";

import { debtors1cAdapter, toOsbbBalance } from "../adapters/debtors1c";
import { validateImportFileDescriptor } from "../fileSecurity";
import { reconcileDebtors1cRows } from "../matching";
import type { ActiveApartmentRegistryRow } from "../workflowTypes";
import type { Debtors1cImportState } from "../debtors1cImportState";
import type { RawSheet } from "../types";

const MAX_UPLOADS_PER_HOUR = 10;

export async function parseDebtors1cImportBuffer(
  _previousState: Debtors1cImportState,
  formData: FormData,
): Promise<Debtors1cImportState> {
  const access = await requireAccess(
    String(formData.get("houseId") ?? "").trim(),
  );
  if (!access.ok) return access;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Оберіть файл XLS або XLSX." };
  }

  const security = validateImportFileDescriptor({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!security.ok) return security;

  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const rate = await supabase
    .from("import_buffer_uploads")
    .select("id", { count: "exact", head: true })
    .eq("created_by", access.user.id)
    .gte("created_at", since);

  if (rate.error) {
    return { ok: false, error: "Не вдалося перевірити ліміт завантажень." };
  }

  if ((rate.count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
    return {
      ok: false,
      error: "Перевищено ліміт: не більше 10 файлів на годину.",
    };
  }

  let sheet: RawSheet;
  try {
    sheet = readFirstSheet(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Не вдалося прочитати файл 1С." };
  }

  const detected = debtors1cAdapter.detect(sheet);
  if (!detected.matched) {
    return {
      ok: false,
      error:
        detected.reason ??
        "Файл не відповідає підтвердженому формату боржників 1С.",
    };
  }

  const header = debtors1cAdapter.locateHeader(sheet);
  if (!header.ok) {
    return { ok: false, error: header.error.message };
  }

  const period = debtors1cAdapter.extractPeriod(sheet);
  const parsedRows = debtors1cAdapter.parseRows(sheet, header.value);

  const registryResult = await supabase
    .from("house_apartments")
    .select("id, account_number, apartment_label, owner_name, area")
    .eq("house_id", access.house.id)
    .is("archived_at", null);

  if (registryResult.error) {
    return {
      ok: false,
      error: "Не вдалося завантажити активний реєстр квартир.",
    };
  }

  const registry: ActiveApartmentRegistryRow[] = (
    registryResult.data ?? []
  ).map((row) => ({
    id: String(row.id),
    accountNumber: String(row.account_number ?? "").trim(),
    apartmentLabel: String(row.apartment_label ?? "").trim(),
    ownerName: String(row.owner_name ?? "").trim(),
    area: row.area === null || row.area === undefined ? null : Number(row.area),
  }));

  const reconciliation = reconcileDebtors1cRows(
    { period, rows: parsedRows },
    registry,
  );

  const registryById = new Map(registry.map((row) => [row.id, row]));

  const uploadInsert = await supabase
    .from("import_buffer_uploads")
    .insert({
      house_id: access.house.id,
      adapter_key: "debtors_1c",
      original_file_name: file.name,
      file_size: file.size,
      detected_period_year: period?.year ?? null,
      detected_period_month: period?.month ?? null,
      confirmed_period_year: null,
      confirmed_period_month: null,
      status: "parsed",
      stats: {
        matchedCount: reconciliation.matchedCount,
        warningCount: reconciliation.warningCount,
        unknownSourceAccounts: reconciliation.unknownSourceAccountNumbers,
        missingRegistryAccounts: reconciliation.registryAccountsMissingFromFile,
      },
      created_by: access.user.id,
    })
    .select("id, lock_version")
    .single();

  if (uploadInsert.error || !uploadInsert.data) {
    return { ok: false, error: "Не вдалося створити буфер імпорту." };
  }

  const stagingRows = reconciliation.rows.map((row) => {
    if (row.classification !== "data") {
      return {
        upload_id: uploadInsert.data.id,
        row_index: row.rowIndex,
        classification: row.classification,
        match_status: "skipped",
        warnings: [],
      };
    }

    return {
      upload_id: uploadInsert.data.id,
      row_index: row.rowIndex,
      classification: "data",
      account_number_raw: row.source.accountNumberRaw,
      account_number_normalized: row.source.accountNumberNormalized,
      apartment_label: row.source.apartmentLabel,
      owner_name: row.source.ownerName,
      area: row.source.area,
      opening_balance: row.source.openingBalance,
      accrued: row.source.accrued,
      paid: row.source.paid,
      closing_balance: row.source.closingBalance,
      debt_value: row.source.debtValue,
      match_status: row.matchStatus,
      matched_apartment_id: row.matchedApartmentId,
      warnings: row.warnings,
    };
  });

  const rowInsert = await supabase
    .from("import_buffer_rows")
    .insert(stagingRows);

  if (rowInsert.error) {
    await supabase
      .from("import_buffer_uploads")
      .delete()
      .eq("id", uploadInsert.data.id);

    return { ok: false, error: "Не вдалося зберегти рядки буфера." };
  }

  return {
    ok: true,
    uploadId: String(uploadInsert.data.id),
    lockVersion: Number(uploadInsert.data.lock_version),
    status: "parsed",
    detectedPeriod: period,
    confirmedPeriod: null,
    rows: reconciliation.rows
      .filter((row) => row.classification === "data")
      .map((row) => {
        const registryRow = row.matchedApartmentId
          ? (registryById.get(row.matchedApartmentId) ?? null)
          : null;

        return {
          rowIndex: row.rowIndex,
          accountNumber: row.source.accountNumberNormalized,
          apartmentLabel:
            registryRow?.apartmentLabel ?? row.source.apartmentLabel,
          ownerName: registryRow?.ownerName ?? row.source.ownerName,
          sourceApartmentLabel: row.source.apartmentLabel,
          sourceOwnerName: row.source.ownerName,
          debtValue: row.source.debtValue,
          osbbBalance: row.source.osbbBalance,
          matchStatus: row.matchStatus,
          warnings: row.warnings,
        };
      }),
    unknownSourceAccounts: reconciliation.unknownSourceAccountNumbers,
    missingRegistryAccounts: reconciliation.registryAccountsMissingFromFile,
    warningCount: reconciliation.warningCount,
    message: "Файл оброблено. Перевірте preview і підтвердьте період.",
  };
}

export async function confirmDebtors1cImportPeriod(
  state: Debtors1cImportState,
  formData: FormData,
): Promise<Debtors1cImportState> {
  if (!state.ok) return { ok: false, error: "Спочатку завантажте файл." };

  const access = await requireAccess(
    String(formData.get("houseId") ?? "").trim(),
  );
  if (!access.ok) return access;

  const year = Number(formData.get("periodYear"));
  const month = Number(formData.get("periodMonth"));

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return { ok: false, error: "Вкажіть коректний місяць і рік." };
  }

  const supabase = await createSupabaseServerClient();
  const update = await supabase
    .from("import_buffer_uploads")
    .update({
      confirmed_period_year: year,
      confirmed_period_month: month,
      status: "confirmed",
    })
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .eq("status", "parsed")
    .eq("lock_version", state.lockVersion)
    .select("lock_version")
    .maybeSingle();

  if (update.error || !update.data) {
    return { ok: false, error: "Дані застаріли. Завантажте preview повторно." };
  }

  return {
    ...state,
    status: "confirmed",
    lockVersion: Number(update.data.lock_version),
    confirmedPeriod: { year, month },
    message: "Період підтверджено.",
  };
}

export async function discardDebtors1cImportBuffer(
  state: Debtors1cImportState,
  formData: FormData,
): Promise<Debtors1cImportState> {
  if (!state.ok) return state;

  const access = await requireAccess(
    String(formData.get("houseId") ?? "").trim(),
  );
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();
  const update = await supabase
    .from("import_buffer_uploads")
    .update({ status: "discarded" })
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .eq("lock_version", state.lockVersion)
    .in("status", ["parsed", "confirmed"])
    .select("lock_version")
    .maybeSingle();

  if (update.error || !update.data) {
    return { ok: false, error: "Не вдалося скасувати буфер." };
  }

  return {
    ...state,
    status: "discarded",
    lockVersion: Number(update.data.lock_version),
    message: "Буфер скасовано.",
  };
}

export async function transferDebtors1cImportBuffer(
  state: Debtors1cImportState,
  formData: FormData,
): Promise<Debtors1cImportState> {
  if (!state.ok || state.status !== "confirmed" || !state.confirmedPeriod) {
    return { ok: false, error: "Спочатку підтвердьте період." };
  }

  if (state.unknownSourceAccounts.length > 0) {
    return {
      ok: false,
      error: "Файл містить невідомі особові рахунки. Передача заблокована.",
    };
  }

  const access = await requireAccess(
    String(formData.get("houseId") ?? "").trim(),
  );
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();

  const upload = await supabase
    .from("import_buffer_uploads")
    .select("id, status, lock_version")
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .maybeSingle();

  if (
    upload.error ||
    !upload.data ||
    upload.data.status !== "confirmed" ||
    Number(upload.data.lock_version) !== state.lockVersion
  ) {
    return { ok: false, error: "Дані застаріли. Оновіть preview." };
  }

  const staged = await supabase
    .from("import_buffer_rows")
    .select(
      "account_number_normalized, accrued, paid, debt_value, match_status, matched_apartment_id",
    )
    .eq("upload_id", state.uploadId)
    .eq("classification", "data")
    .order("row_index", { ascending: true });

  if (staged.error || !staged.data?.length) {
    return { ok: false, error: "Не вдалося завантажити staged rows." };
  }

  if (
    staged.data.some(
      (row) =>
        row.match_status !== "matched" ||
        !row.matched_apartment_id ||
        !row.account_number_normalized ||
        row.debt_value === null,
    )
  ) {
    return {
      ok: false,
      error: "Не всі рядки зіставлено з активним реєстром квартир.",
    };
  }

  const result = await dispatchAdminCommand({
    type: "debtors.importMonthDraft",
    houseId: access.house.id,
    payload: {
      periodYear: state.confirmedPeriod.year,
      periodMonth: state.confirmedPeriod.month,
      source: "buffer_1c",
      importMeta: {
        importBufferUploadId: state.uploadId,
        adapterKey: "debtors_1c",
        detectedPeriod: state.detectedPeriod,
        confirmedPeriod: state.confirmedPeriod,
        warningCount: state.warningCount,
        missingRegistryAccounts: state.missingRegistryAccounts,
      },
      rows: staged.data.map((row) => ({
        accountNumber: String(row.account_number_normalized),
        accrued: row.accrued === null ? null : Number(row.accrued),
        paid: row.paid === null ? null : Number(row.paid),
        closingBalance: toOsbbBalance(Number(row.debt_value)) as number,
        debtSourceValue: Number(row.debt_value),
      })),
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    snapshot?: { id?: string };
  };
  const snapshotId = String(payload?.snapshot?.id ?? "").trim();

  if (!snapshotId) {
    return {
      ok: false,
      error: "Чернетку створено, але snapshot ID не визначено.",
    };
  }

  const mark = await supabase
    .from("import_buffer_uploads")
    .update({
      status: "transferred",
      stats: {
        snapshotId,
        warningCount: state.warningCount,
        missingRegistryAccounts: state.missingRegistryAccounts,
      },
    })
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .eq("status", "confirmed")
    .eq("lock_version", state.lockVersion)
    .select("lock_version")
    .maybeSingle();

  if (mark.error || !mark.data) {
    return {
      ok: false,
      error: "Чернетку створено, але буфер не вдалося позначити переданим.",
    };
  }

  revalidatePath(`/admin/houses/${access.house.id}`);

  return {
    ...state,
    status: "transferred",
    lockVersion: Number(mark.data.lock_version),
    snapshotId,
    message: "Дані передано в чернетку боржників.",
  };
}

async function requireAccess(houseId: string) {
  if (!houseId) {
    return { ok: false as const, error: "Будинок не визначено." };
  }

  const user = await getCurrentAdminUser();
  if (!user) {
    return {
      ok: false as const,
      error: "Потрібна авторизація адміністратора.",
    };
  }

  const accessError = assertWorkspaceAction({
    role: user.role as never,
    workspace: "debtors",
    action: "create",
  });

  if (accessError?.error) {
    return { ok: false as const, error: accessError.error };
  }

  const house = await getAdminHouseById(houseId);
  if (!house) {
    return { ok: false as const, error: "Будинок не знайдено." };
  }

  return { ok: true as const, user, house };
}

function readFirstSheet(buffer: ArrayBuffer): RawSheet {
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: true,
    cellDates: false,
    dense: true,
  });

  const name = workbook.SheetNames[0];
  if (!name) throw new Error("Workbook has no sheets");

  return {
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
    }),
  };
}
