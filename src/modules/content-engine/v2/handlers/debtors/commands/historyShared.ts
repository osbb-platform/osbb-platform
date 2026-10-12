import {
  buildDebtPublicationPlan,
  type DebtorHistorySnapshot,
} from "../../../../../houses/debtors-history/buildDebtPublicationPlan";
import {
  chunkValues,
  readAllCountedPages,
} from "@/src/shared/data/readAllCountedPages";

import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import type {
  HouseDebtorMonthRow,
  HouseDebtorMonthSnapshot,
  HouseDebtorMonthSnapshotWithRows,
  HouseDebtorMonthSource,
  ImportMonthDraftPayload,
  ImportMonthDraftRowPayload,
  MonthSnapshotIdAndLockPayload,
  RelabelMonthSnapshotPayload,
} from "../types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const IMPORT_SOURCES = new Set<HouseDebtorMonthSource>([
  "manual_import",
  "buffer_1c",
  "manual_edit",
]);
const SNAPSHOT_IDS_PER_HISTORY_QUERY = 100;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePeriod(year: unknown, month: unknown) {
  if (
    typeof year !== "number" ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    typeof month !== "number" ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return err(
      "Вкажіть коректний місяць і рік з 2000 до 2100.",
      "VALIDATION_FAILED",
    );
  }

  return ok({
    periodYear: year,
    periodMonth: month,
  });
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined) {
    return ok<number | null>(null);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return err(
      "Числові поля містять некоректне значення.",
      "VALIDATION_FAILED",
    );
  }

  return ok(value);
}

export function normalizeImportMonthPayload(
  rawPayload: unknown,
): Result<ImportMonthDraftPayload> {
  if (!rawPayload || typeof rawPayload !== "object") {
    return err("Дані імпорту відсутні.", "VALIDATION_FAILED");
  }

  const raw = rawPayload as Record<string, unknown>;
  const period = normalizePeriod(raw.periodYear, raw.periodMonth);
  if (!period.ok) return period;

  const sourceText = normalizeText(raw.source) || "manual_import";

  if (!IMPORT_SOURCES.has(sourceText as HouseDebtorMonthSource)) {
    return err("Непідтримуване джерело імпорту.", "VALIDATION_FAILED");
  }

  if (!Array.isArray(raw.rows) || raw.rows.length === 0) {
    return err("Додайте хоча б один рядок за місяць.", "VALIDATION_FAILED");
  }

  const accountNumbers = new Set<string>();
  const rows: ImportMonthDraftRowPayload[] = [];

  for (const rawRow of raw.rows) {
    if (!rawRow || typeof rawRow !== "object") {
      return err(
        "Рядки імпорту мають некоректний формат.",
        "VALIDATION_FAILED",
      );
    }

    const row = rawRow as Record<string, unknown>;
    const accountNumber = normalizeText(row.accountNumber);

    if (!accountNumber) {
      return err("Особовий рахунок є обов’язковим.", "VALIDATION_FAILED");
    }

    if (accountNumbers.has(accountNumber)) {
      return err(
        `Особовий рахунок ${accountNumber} повторюється у файлі.`,
        "VALIDATION_FAILED",
      );
    }

    if (
      typeof row.closingBalance !== "number" ||
      !Number.isFinite(row.closingBalance) ||
      Math.abs(row.closingBalance) > 9_999_999_999.99
    ) {
      return err(
        `Для рахунку ${accountNumber} вкажіть коректний кінцевий баланс.`,
        "VALIDATION_FAILED",
      );
    }

    const accrued = normalizeOptionalNumber(row.accrued);
    if (!accrued.ok) return accrued;
    if (accrued.data !== null && Math.abs(accrued.data) > 9_999_999_999.99) {
      return err(
        "Сума нарахувань виходить за допустимі межі.",
        "VALIDATION_FAILED",
      );
    }

    const paid = normalizeOptionalNumber(row.paid);
    if (!paid.ok) return paid;
    if (paid.data !== null && Math.abs(paid.data) > 9_999_999_999.99) {
      return err(
        "Сума оплати виходить за допустимі межі.",
        "VALIDATION_FAILED",
      );
    }

    const debtSourceValue = normalizeOptionalNumber(row.debtSourceValue);
    if (!debtSourceValue.ok) return debtSourceValue;
    if (
      debtSourceValue.data !== null &&
      Math.abs(debtSourceValue.data) > 9_999_999_999.99
    ) {
      return err("Сума боргу виходить за допустимі межі.", "VALIDATION_FAILED");
    }

    accountNumbers.add(accountNumber);
    rows.push({
      accountNumber,
      accrued: accrued.data,
      paid: paid.data,
      closingBalance: row.closingBalance,
      debtSourceValue: debtSourceValue.data,
    });
  }

  const importMeta =
    raw.importMeta &&
    typeof raw.importMeta === "object" &&
    !Array.isArray(raw.importMeta)
      ? (raw.importMeta as Record<string, unknown>)
      : {};

  let bufferTransfer: ImportMonthDraftPayload["bufferTransfer"];
  if (raw.bufferTransfer !== undefined) {
    if (
      sourceText !== "buffer_1c" ||
      !raw.bufferTransfer ||
      typeof raw.bufferTransfer !== "object" ||
      Array.isArray(raw.bufferTransfer)
    ) {
      return err("Некоректний контекст передачі буфера.", "VALIDATION_FAILED");
    }

    const transfer = raw.bufferTransfer as Record<string, unknown>;
    const uploadId = normalizeText(transfer.uploadId);
    if (
      !UUID_PATTERN.test(uploadId) ||
      typeof transfer.expectedLockVersion !== "number" ||
      !Number.isInteger(transfer.expectedLockVersion) ||
      transfer.expectedLockVersion < 1 ||
      typeof transfer.acceptPartial !== "boolean"
    ) {
      return err("Некоректний контекст передачі буфера.", "VALIDATION_FAILED");
    }

    bufferTransfer = {
      uploadId,
      expectedLockVersion: transfer.expectedLockVersion,
      acceptPartial: transfer.acceptPartial,
    };
  }

  return ok({
    ...period.data,
    source: sourceText as Exclude<HouseDebtorMonthSource, "migration_legacy">,
    importMeta,
    rows,
    ...(bufferTransfer ? { bufferTransfer } : {}),
  });
}

export function readMonthSnapshotIdAndLock(
  rawPayload: unknown,
): Result<MonthSnapshotIdAndLockPayload> {
  if (!rawPayload || typeof rawPayload !== "object") {
    return err("Дані знімка відсутні.", "VALIDATION_FAILED");
  }

  const raw = rawPayload as Record<string, unknown>;
  const id = normalizeText(raw.id);

  if (!UUID_PATTERN.test(id)) {
    return err("Некоректний ідентифікатор знімка.", "VALIDATION_FAILED");
  }

  if (
    typeof raw.lockVersion !== "number" ||
    !Number.isInteger(raw.lockVersion) ||
    raw.lockVersion < 1
  ) {
    return err("Некоректна версія знімка.", "VALIDATION_FAILED");
  }

  return ok({
    id,
    lockVersion: raw.lockVersion,
  });
}

export function readRelabelMonthPayload(
  rawPayload: unknown,
): Result<RelabelMonthSnapshotPayload> {
  const idAndLock = readMonthSnapshotIdAndLock(rawPayload);
  if (!idAndLock.ok) return idAndLock;

  const raw = rawPayload as Record<string, unknown>;
  const period = normalizePeriod(raw.periodYear, raw.periodMonth);
  if (!period.ok) return period;

  return ok({
    ...idAndLock.data,
    ...period.data,
  });
}

function mapSnapshotRow(row: HouseDebtorMonthRow) {
  return {
    apartmentId: row.apartment_id,
    accountNumber: row.account_number,
    apartmentLabel: row.apartment_label,
    ownerName: row.owner_name,
    area: row.area === null ? null : Number(row.area),
    accrued: row.accrued === null ? null : Number(row.accrued),
    paid: row.paid === null ? null : Number(row.paid),
    closingBalance: Number(row.closing_balance),
    debtSourceValue:
      row.debt_source_value === null ? null : Number(row.debt_source_value),
  };
}

function toHistorySnapshot(
  value: HouseDebtorMonthSnapshotWithRows,
): DebtorHistorySnapshot {
  return {
    id: value.snapshot.id,
    periodYear: value.snapshot.period_year,
    periodMonth: value.snapshot.period_month,
    revision: value.snapshot.revision,
    status: value.snapshot.status,
    rows: value.rows.map(mapSnapshotRow),
  };
}

export async function getMonthSnapshot(
  ctx: HandlerContext,
  snapshotId: string,
): Promise<Result<HouseDebtorMonthSnapshotWithRows>> {
  const snapshotResult = await ctx.supabase
    .from("house_debtor_month_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (snapshotResult.error) {
    return err("Не вдалося завантажити місячний знімок.", "INTERNAL");
  }

  if (!snapshotResult.data) {
    return err("Місячний знімок не знайдено.", "NOT_FOUND");
  }

  let rows: HouseDebtorMonthRow[];

  try {
    rows = await readAllCountedPages<HouseDebtorMonthRow>({
      label: "debtor snapshot rows",
      getRowKey: (row) => row.id,
      fetchPage: async (from, to) => {
        const result = await ctx.supabase
          .from("house_debtor_month_rows")
          .select("*", { count: "exact" })
          .eq("snapshot_id", snapshotId)
          .eq("house_id", ctx.house.id)
          .order("account_number", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as HouseDebtorMonthRow[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("Failed to load complete debtor snapshot rows:", error);
    return err("Не вдалося завантажити рядки знімка.", "INTERNAL");
  }

  return ok({
    snapshot: snapshotResult.data as HouseDebtorMonthSnapshot,
    rows,
  });
}

async function getPublishedSnapshots(
  ctx: HandlerContext,
): Promise<Result<HouseDebtorMonthSnapshotWithRows[]>> {
  let snapshots: HouseDebtorMonthSnapshot[];

  try {
    snapshots = await readAllCountedPages<HouseDebtorMonthSnapshot>({
      label: "published debtor snapshots",
      getRowKey: (snapshot) => snapshot.id,
      fetchPage: async (from, to) => {
        const result = await ctx.supabase
          .from("house_debtor_month_snapshots")
          .select("*", { count: "exact" })
          .eq("house_id", ctx.house.id)
          .eq("status", "published")
          .order("period_year", { ascending: true })
          .order("period_month", { ascending: true })
          .order("revision", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as HouseDebtorMonthSnapshot[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("Failed to load complete published debtor snapshots:", error);
    return err("Не вдалося завантажити історію боргів.", "INTERNAL");
  }

  if (snapshots.length === 0) {
    return ok([]);
  }

  const rowsBySnapshot = new Map(
    snapshots.map((snapshot) => [snapshot.id, [] as HouseDebtorMonthRow[]]),
  );

  try {
    const seenRowIds = new Set<string>();
    const snapshotIdChunks = chunkValues(
      snapshots.map((snapshot) => snapshot.id),
      SNAPSHOT_IDS_PER_HISTORY_QUERY,
    );

    for (const [chunkIndex, snapshotIds] of snapshotIdChunks.entries()) {
      const rows = await readAllCountedPages<HouseDebtorMonthRow>({
        label: `published debtor history rows chunk ${chunkIndex + 1}`,
        getRowKey: (row) => row.id,
        fetchPage: async (from, to) => {
          const result = await ctx.supabase
            .from("house_debtor_month_rows")
            .select("*", { count: "exact" })
            .eq("house_id", ctx.house.id)
            .in("snapshot_id", snapshotIds)
            .order("snapshot_id", { ascending: true })
            .order("account_number", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to);

          return {
            data: (result.data ?? []) as HouseDebtorMonthRow[],
            error: result.error,
            count: result.count,
          };
        },
      });

      for (const row of rows) {
        if (seenRowIds.has(row.id)) {
          throw new Error("Duplicate published debtor history row");
        }
        seenRowIds.add(row.id);

        const snapshotRows = rowsBySnapshot.get(row.snapshot_id);
        if (!snapshotRows) {
          throw new Error("Unexpected snapshot row in published history");
        }

        snapshotRows.push(row);
      }
    }
  } catch (error) {
    console.error("Failed to load complete published debtor history:", error);
    return err("Не вдалося завантажити історичні рядки.", "INTERNAL");
  }

  return ok(
    snapshots.map((snapshot) => ({
      snapshot,
      rows: rowsBySnapshot.get(snapshot.id) ?? [],
    })),
  );
}

export async function buildPublicationPlanForSnapshot(
  ctx: HandlerContext,
  target: HouseDebtorMonthSnapshotWithRows,
) {
  const publishedResult = await getPublishedSnapshots(ctx);
  if (!publishedResult.ok) return publishedResult;

  try {
    return ok(
      buildDebtPublicationPlan({
        publishedSnapshots: publishedResult.data.map(toHistorySnapshot),
        targetSnapshot: toHistorySnapshot(target),
      }),
    );
  } catch (error) {
    console.error("buildDebtPublicationPlan failed:", error);
    return err("Не вдалося розрахувати історію боргу.", "INTERNAL");
  }
}

export async function getMissingRegistryAccounts(
  ctx: HandlerContext,
  importedAccounts: readonly string[],
): Promise<Result<string[]>> {
  let apartmentRows: { id: string; account_number: string }[];

  try {
    apartmentRows = await readAllCountedPages<{
      id: string;
      account_number: string;
    }>({
      label: "active apartment registry accounts",
      getRowKey: (row) => row.id,
      fetchPage: async (from, to) => {
        const result = await ctx.supabase
          .from("house_apartments")
          .select("id, account_number", { count: "exact" })
          .eq("house_id", ctx.house.id)
          .is("archived_at", null)
          .order("account_number", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as {
            id: string;
            account_number: string;
          }[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("Failed to load complete apartment registry:", error);
    return err("Не вдалося перевірити реєстр квартир.", "INTERNAL");
  }

  const imported = new Set(importedAccounts);

  const missing = apartmentRows
    .map((row) => normalizeText(row.account_number))
    .filter((accountNumber) => accountNumber && !imported.has(accountNumber))
    .sort((left, right) => left.localeCompare(right, "uk", { numeric: true }));

  return ok(missing);
}

export function mapDebtorHistoryRpcError(message: string): Result<never> {
  if (message.includes("P04_STALE")) {
    return err("Дані буфера застаріли, оновіть preview.", "STALE_CONTENT");
  }

  if (message.includes("P04_PARTIAL_CONFIRMATION_REQUIRED")) {
    return err(
      "Є неспівставлені рядки. Підтвердьте усвідомлений частковий перенос.",
      "VALIDATION_FAILED",
    );
  }

  if (message.includes("P04_MISSING_DEBT")) {
    return err(
      "У зіставлених рядках відсутнє значення боргу. Передача зупинена.",
      "VALIDATION_FAILED",
    );
  }

  if (
    message.includes("P04_COUNTER") ||
    message.includes("P04_SOURCE_COUNT") ||
    message.includes("P04_STAGED_COUNTERS_CHANGED") ||
    message.includes("P04_REGISTRY_MAPPING_CHANGED") ||
    message.includes("P04_PERSISTED_COUNT_MISMATCH") ||
    message.includes("P04_EXISTING_SNAPSHOT") ||
    message.includes("P04_TRANSFERRED_") ||
    message.includes("P04_DUPLICATE_REGISTRY_ACCOUNT") ||
    message.includes("P04_DUPLICATE_MATCHED_APARTMENT") ||
    message.includes("P04_INVALID_MATCHED_ROW")
  ) {
    return err(
      "Буфер або реєстр змінився. Передача зупинена; оновіть preview.",
      "STALE_CONTENT",
    );
  }

  if (
    message.includes("P04_UPLOAD_NOT_FOUND") ||
    message.includes("P04_HOUSE_NOT_FOUND") ||
    message.includes("P04_NO_TRANSFERABLE_ROWS") ||
    message.includes("P04_CONFIRMED_PERIOD_REQUIRED") ||
    message.includes("P04_INVALID_ATOMIC_TRANSFER_INPUT")
  ) {
    return err("Перевірте дані буфера імпорту.", "VALIDATION_FAILED");
  }

  if (message.includes("P03_STALE")) {
    return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
  }

  if (message.includes("P03_NOT_FOUND")) {
    return err("Місячний знімок не знайдено.", "NOT_FOUND");
  }

  if (message.includes("P03_FORBIDDEN")) {
    return err("Недостатньо прав для цієї дії.", "FORBIDDEN");
  }

  if (message.includes("P03_UNKNOWN_ACCOUNT")) {
    const details = message.split("P03_UNKNOWN_ACCOUNT:")[1]?.trim();
    return err(
      details
        ? `Не знайдено в реєстрі квартир: ${details}. Імпорт не виконано.`
        : "Файл містить невідомі особові рахунки. Імпорт не виконано.",
      "VALIDATION_FAILED",
    );
  }

  if (
    message.includes("P03_INVALID") ||
    message.includes("P03_DUPLICATE_ACCOUNT") ||
    message.includes("P03_SAME_PERIOD")
  ) {
    return err("Перевірте дані місячного знімка.", "VALIDATION_FAILED");
  }

  console.error("Debtor history RPC failed:", message);
  return err("Не вдалося виконати операцію з історією боргів.", "INTERNAL");
}

export function monthSnapshotHistoryMetadata(
  value: HouseDebtorMonthSnapshotWithRows,
  extra?: Record<string, unknown>,
) {
  return {
    subSectionKey: "debtors",
    periodYear: value.snapshot.period_year,
    periodMonth: value.snapshot.period_month,
    revision: value.snapshot.revision,
    rowsCount: value.rows.length,
    source: value.snapshot.source,
    ...extra,
  };
}
