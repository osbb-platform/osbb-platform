"use server";

import { revalidatePath } from "next/cache";

import { dispatchAdminCommand } from "@/src/modules/content-engine/v2/dispatch";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";
import { assertWorkspaceAction } from "@/src/shared/permissions/actionAccess";
import { readAllCountedPages } from "@/src/shared/data/readAllCountedPages";
import { rateLimitPolicies } from "@/src/shared/security/rateLimitPolicies";
import { consumeServerRateLimit } from "@/src/shared/security/serverRateLimit";

import { debtors1cAdapter, toOsbbBalance } from "../adapters/debtors1c";
import {
  buildDebtors1cImportCounters,
  readStoredImportCounters,
  resolveStoredConfirmedPeriod,
} from "../debtors1cImportDiagnostics";
import { validateImportFileDescriptor } from "../fileSecurity";
import {
  recoverConfirmedDebtors1cImportState,
  recoverTransferredDebtors1cImportState,
} from "../debtors1cImportRecovery";
import {
  hasDebtors1cRegistryMappingChanged,
  reconcileDebtors1cRows,
} from "../matching";
import { readDebtors1cWorkbook } from "../readDebtors1cWorkbook";
import type { RawSheet } from "../types";
import type { ActiveApartmentRegistryRow } from "../workflowTypes";
import type { Debtors1cImportState } from "../debtors1cImportState";

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

  try {
    const rateLimit = await consumeServerRateLimit({
      policy: rateLimitPolicies.importBufferUpload,
      subject: [access.user.id, access.house.id].join(":"),
    });

    if (!rateLimit.allowed) {
      return {
        ok: false,
        error: `Забагато спроб імпорту. Повторіть через ${Math.max(
          1,
          rateLimit.retryAfterSeconds,
        )} с.`,
      };
    }
  } catch (error) {
    console.error("[P04 debtors 1C] Import rate limit unavailable", {
      houseId: access.house.id,
      error,
    });
    return {
      ok: false,
      error: "Не вдалося перевірити ліміт імпорту. Повторіть пізніше.",
    };
  }

  const supabase = await createSupabaseServerClient();

  let sheet: RawSheet;
  try {
    sheet = readDebtors1cWorkbook(await file.arrayBuffer());
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Не вдалося прочитати файл 1С.",
    };
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

  type RegistryRow = {
    id: string;
    account_number: string;
    apartment_label: string;
    owner_name: string;
    area: number | null;
  };
  let registryRows: RegistryRow[];

  try {
    registryRows = await readAllCountedPages<RegistryRow>({
      label: "active apartment registry for 1C import",
      getRowKey: (row) => row.id,
      fetchPage: async (from, to) => {
        const result = await supabase
          .from("house_apartments")
          .select(
            "id, account_number, apartment_label, owner_name, area",
            { count: "exact" },
          )
          .eq("house_id", access.house.id)
          .is("archived_at", null)
          .order("account_number", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as RegistryRow[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("[P04 debtors 1C] Failed to load complete registry", {
      houseId: access.house.id,
      error,
    });
    return {
      ok: false,
      error: "Не вдалося завантажити активний реєстр квартир.",
    };
  }

  const registry: ActiveApartmentRegistryRow[] = registryRows.map((row) => ({
    id: String(row.id),
    accountNumber: String(row.account_number ?? "").trim(),
    apartmentLabel: String(row.apartment_label ?? "").trim(),
    ownerName: String(row.owner_name ?? "").trim(),
    area: row.area === null || row.area === undefined ? null : Number(row.area),
  }));

  let reconciliation;
  try {
    reconciliation = reconcileDebtors1cRows(
      { period, rows: parsedRows },
      registry,
    );
  } catch (error) {
    console.error("[P04 debtors 1C] Failed to reconcile import rows", {
      houseId: access.house.id,
      fileName: file.name,
      error,
    });

    return {
      ok: false,
      error:
        "Реєстр квартир містить конфліктні або некоректні особові рахунки. Перевірте реєстр перед повторним імпортом.",
    };
  }

  const registryById = new Map(registry.map((row) => [row.id, row]));

  const counters = buildDebtors1cImportCounters({
    sourceRows: sheet.rows.length,
    registryRows: registry.length,
    rows: reconciliation.rows.map((row) =>
      row.classification === "data"
        ? {
            classification: row.classification,
            match_status: row.matchStatus,
            matched_apartment_id: row.matchedApartmentId,
            account_number_normalized: row.source.accountNumberNormalized,
            debt_value: row.source.debtValue,
          }
        : {
            classification: row.classification,
            match_status: "skipped" as const,
            matched_apartment_id: null,
            account_number_normalized: null,
            debt_value: null,
          },
    ),
  });

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
        counters,
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
    counters,
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

  if (!update.error && update.data) {
    return {
      ...state,
      status: "confirmed",
      lockVersion: Number(update.data.lock_version),
      confirmedPeriod: { year, month },
      message: "Період підтверджено.",
    };
  }

  const current = await supabase
    .from("import_buffer_uploads")
    .select(
      "status, lock_version, confirmed_period_year, confirmed_period_month, stats",
    )
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .maybeSingle();

  if (!current.error && current.data) {
    const recovered = recoverConfirmedDebtors1cImportState(
      state,
      current.data,
      { year, month },
    );

    if (recovered) return recovered;
  }

  if (update.error) {
    console.error("[P04 debtors 1C] Failed to confirm import period", {
      houseId: access.house.id,
      uploadId: state.uploadId,
      error: update.error.message,
    });
  }

  return { ok: false, error: "Дані застаріли. Завантажте preview повторно." };
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
  if (!state.ok) {
    return { ok: false, error: "Спочатку підтвердьте період." };
  }

  const access = await requireAccess(
    String(formData.get("houseId") ?? "").trim(),
  );
  if (!access.ok) return access;

  const supabase = await createSupabaseServerClient();

  const upload = await supabase
    .from("import_buffer_uploads")
    .select(
      "id, status, lock_version, detected_period_year, detected_period_month, confirmed_period_year, confirmed_period_month, stats, original_file_name",
    )
    .eq("id", state.uploadId)
    .eq("house_id", access.house.id)
    .maybeSingle();

  if (upload.error || !upload.data) {
    return { ok: false, error: "Буфер імпорту не знайдено." };
  }

  const alreadyTransferred = recoverTransferredDebtors1cImportState(
    state,
    upload.data,
  );

  if (alreadyTransferred) {
    return alreadyTransferred;
  }

  if (
    upload.data.status !== "confirmed" ||
    Number(upload.data.lock_version) !== state.lockVersion
  ) {
    return { ok: false, error: "Дані застаріли. Оновіть preview." };
  }

  const confirmedPeriod = resolveStoredConfirmedPeriod(upload.data);
  if (!confirmedPeriod) {
    return {
      ok: false,
      error: "У буфері відсутній коректний підтверджений період.",
    };
  }

  type StagedRow = {
    row_index: number;
    classification:
      | "data"
      | "skip_service"
      | "skip_provider"
      | "skip_group"
      | "skip_total";
    account_number_normalized: string | null;
    apartment_label: string | null;
    accrued: number | null;
    paid: number | null;
    debt_value: number | null;
    match_status: "matched" | "unmatched" | "skipped";
    matched_apartment_id: string | null;
  };

  let stagedRows: StagedRow[];
  try {
    stagedRows = await readAllCountedPages<StagedRow>({
      label: "1C staged import rows",
      getRowKey: (row) => row.row_index,
      fetchPage: async (from, to) => {
        const result = await supabase
          .from("import_buffer_rows")
          .select(
            "row_index, classification, account_number_normalized, apartment_label, accrued, paid, debt_value, match_status, matched_apartment_id",
            { count: "exact" },
          )
          .eq("upload_id", state.uploadId)
          .order("row_index", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as StagedRow[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("[P04 debtors 1C] Failed to load complete staged rows", {
      houseId: access.house.id,
      uploadId: state.uploadId,
      error,
    });
    return { ok: false, error: "Не вдалося завантажити staged rows." };
  }

  if (stagedRows.length === 0) {
    return { ok: false, error: "Буфер не містить staged rows." };
  }

  const storedCounters = readStoredImportCounters(upload.data.stats);
  if (
    storedCounters &&
    storedCounters.classifiedRows !== stagedRows.length
  ) {
    return {
      ok: false,
      error:
        "Кількість staged rows не збігається з preview. Передача зупинена.",
    };
  }

  const counters = buildDebtors1cImportCounters({
    sourceRows: storedCounters?.sourceRows ?? stagedRows.length,
    registryRows: storedCounters?.registryRows ?? 0,
    rows: stagedRows,
  });
  const stagedDataRows = stagedRows.filter(
    (row) => row.classification === "data",
  );

  const matchedRegistryRows = stagedDataRows.filter(
    (row) =>
      row.match_status === "matched" &&
      Boolean(row.matched_apartment_id) &&
      Boolean(row.account_number_normalized),
  );

  if (matchedRegistryRows.length === 0) {
    const error =
      "Жоден рахунок не зіставлено з реєстром квартир. Перевірте реєстр будинку.";

    const failed = await supabase
      .from("import_buffer_uploads")
      .update({
        status: "failed",
        error,
      })
      .eq("id", state.uploadId)
      .eq("house_id", access.house.id)
      .eq("status", "confirmed")
      .eq("lock_version", state.lockVersion)
      .select("id")
      .maybeSingle();

    if (failed.error || !failed.data) {
      console.error("[P10 debtors 1C] Failed to mark zero-match upload", {
        houseId: access.house.id,
        uploadId: state.uploadId,
        error: failed.error?.message,
      });
    }

    return {
      ok: false,
      error,
    };
  }

  if (counters.missingDebtRows > 0) {
    return {
      ok: false,
      error: `У ${counters.missingDebtRows} зіставлених рядках відсутнє значення боргу. Передача зупинена.`,
    };
  }

  const matchedRows = matchedRegistryRows.filter(
    (row) => row.debt_value !== null,
  );

  if (matchedRows.length === 0) {
    return {
      ok: false,
      error: "У зіставлених рядках відсутні значення боргу.",
    };
  }

  const unmatchedRows = stagedDataRows.filter(
    (row) => row.match_status === "unmatched",
  );
  const acceptPartialTransfer =
    formData.get("acceptPartialTransfer") === "true";

  if (
    unmatchedRows.length > 0 &&
    !acceptPartialTransfer
  ) {
    return {
      ok: false,
      error:
        "Є неспівставлені рядки. Підтвердьте усвідомлений частковий перенос.",
    };
  }

  const unmatchedAccounts = unmatchedRows.map((row) => ({
    account: String(row.account_number_normalized ?? "").trim(),
    label: String(row.apartment_label ?? "").trim(),
    debtValue:
      row.debt_value === null
        ? null
        : (toOsbbBalance(Number(row.debt_value)) as number),
  }));

  const unmatchedDebtTotal = unmatchedAccounts.reduce(
    (total, row) => total + (row.debtValue ?? 0),
    0,
  );

  const matchedApartmentIds = [
    ...new Set(matchedRows.map((row) => String(row.matched_apartment_id))),
  ];

  let canonicalRegistry: { id: string; account_number: string }[];
  try {
    canonicalRegistry = await readAllCountedPages<{
      id: string;
      account_number: string;
    }>({
      label: "canonical apartment registry for 1C transfer",
      getRowKey: (row) => String(row.id),
      fetchPage: async (from, to) => {
        const result = await supabase
          .from("house_apartments")
          .select("id, account_number", { count: "exact" })
          .eq("house_id", access.house.id)
          .is("archived_at", null)
          .order("account_number", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: result.data ?? [],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("[P04 debtors 1C] Failed to recheck complete registry", {
      houseId: access.house.id,
      uploadId: state.uploadId,
      error,
    });
    return {
      ok: false,
      error: "Не вдалося повторно перевірити зіставлені квартири.",
    };
  }

  if (
    storedCounters &&
    canonicalRegistry.length !== storedCounters.registryRows
  ) {
    return {
      ok: false,
      error:
        "Активний реєстр квартир змінився після preview. Завантажте файл повторно.",
    };
  }

  const matchedApartmentIdSet = new Set(matchedApartmentIds);

  const canonicalAccountByApartmentId = new Map(
    canonicalRegistry
      .filter((row) => matchedApartmentIdSet.has(String(row.id)))
      .map((row) => [
        String(row.id),
        String(row.account_number ?? "").trim(),
      ]),
  );

  const unresolvedMatchedApartmentIds = matchedApartmentIds.filter(
    (apartmentId) => !canonicalAccountByApartmentId.get(apartmentId),
  );

  if (unresolvedMatchedApartmentIds.length > 0) {
    return {
      ok: false,
      error:
        "Зіставлений реєстр квартир змінився. Завантажте preview повторно.",
    };
  }

  if (
    hasDebtors1cRegistryMappingChanged({
      stagedRows: stagedDataRows,
      registryRows: canonicalRegistry,
    })
  ) {
    return {
      ok: false,
      error:
        "Зіставлення з реєстром квартир змінилося після preview. Завантажте файл повторно.",
    };
  }

  const canonicalTransferAccounts = matchedRows.map((row) =>
    canonicalAccountByApartmentId.get(String(row.matched_apartment_id)),
  );
  if (
    new Set(canonicalTransferAccounts).size !==
    canonicalTransferAccounts.length
  ) {
    return {
      ok: false,
      error:
        "Кілька рядків файлу зіставлено з одним особовим рахунком. Передача зупинена.",
    };
  }

  const uploadStats =
    upload.data.stats &&
    typeof upload.data.stats === "object" &&
    !Array.isArray(upload.data.stats)
      ? (upload.data.stats as Record<string, unknown>)
      : {};
  const warningCount =
    typeof uploadStats.warningCount === "number" &&
    Number.isInteger(uploadStats.warningCount)
    ? Number(uploadStats.warningCount)
    : 0;
  const missingRegistryAccounts = Array.isArray(
    uploadStats.missingRegistryAccounts,
  )
    ? uploadStats.missingRegistryAccounts.map((value) => String(value))
    : [];
  const detectedPeriod =
    typeof upload.data.detected_period_year === "number" &&
    typeof upload.data.detected_period_month === "number" &&
    Number.isInteger(upload.data.detected_period_year) &&
    Number.isInteger(upload.data.detected_period_month)
      ? {
          year: Number(upload.data.detected_period_year),
          month: Number(upload.data.detected_period_month),
        }
      : null;

  const result = await dispatchAdminCommand({
    type: "debtors.importMonthDraft",
    houseId: access.house.id,
    payload: {
      periodYear: confirmedPeriod.year,
      periodMonth: confirmedPeriod.month,
      source: "buffer_1c",
      importMeta: {
        importBufferUploadId: state.uploadId,
        adapterKey: "debtors_1c",
        originalFileName: String(upload.data.original_file_name ?? "").trim(),
        detectedPeriod,
        confirmedPeriod,
        counters,
        warningCount,
        missingRegistryAccounts,
        unmatchedAccounts,
        unmatchedDebtTotal,
      },
      rows: matchedRows.map((row) => ({
        accountNumber: canonicalAccountByApartmentId.get(
          String(row.matched_apartment_id),
        ) as string,
        accrued: row.accrued === null ? null : Number(row.accrued),
        paid: row.paid === null ? null : Number(row.paid),
        closingBalance: toOsbbBalance(Number(row.debt_value)) as number,
        debtSourceValue: Number(row.debt_value),
      })),
      bufferTransfer: {
        uploadId: state.uploadId,
        expectedLockVersion: state.lockVersion,
        acceptPartial: acceptPartialTransfer,
      },
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const payload = result.data as {
    snapshot?: { id?: string };
    rows?: unknown[];
    bufferTransfer?: {
      snapshotId?: unknown;
      persistedRows?: unknown;
      lockVersion?: unknown;
      counters?: unknown;
    };
  };
  const snapshotId = String(payload?.snapshot?.id ?? "").trim();
  const persistedRows = Array.isArray(payload.rows)
    ? payload.rows.length
    : null;
  const atomicPersistedRows = Number(
    payload.bufferTransfer?.persistedRows,
  );
  const atomicLockVersion = Number(payload.bufferTransfer?.lockVersion);

  if (!snapshotId) {
    return {
      ok: false,
      error: "Чернетку створено, але snapshot ID не визначено.",
    };
  }

  if (
    persistedRows !== counters.transferableRows ||
    !Number.isInteger(atomicPersistedRows) ||
    atomicPersistedRows !== counters.transferableRows ||
    !Number.isInteger(atomicLockVersion) ||
    atomicLockVersion < 1
  ) {
    return {
      ok: false,
      error:
        "Результат атомарної передачі не збігається з preview. Оновіть дані.",
    };
  }

  const completedCounters = {
    ...counters,
    persistedRows,
  };

  revalidatePath(`/admin/houses/${access.house.id}`);

  return {
    ...state,
    status: "transferred",
    lockVersion: atomicLockVersion,
    confirmedPeriod,
    counters: completedCounters,
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
