import {
  buildDebtPublicationPlan,
  type DebtorHistorySnapshot,
} from "../../../../../houses/debtors-history/buildDebtPublicationPlan";

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

  return ok({
    ...period.data,
    source: sourceText as Exclude<HouseDebtorMonthSource, "migration_legacy">,
    importMeta,
    rows,
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

  const rowsResult = await ctx.supabase
    .from("house_debtor_month_rows")
    .select("*")
    .eq("snapshot_id", snapshotId)
    .eq("house_id", ctx.house.id)
    .order("account_number", { ascending: true });

  if (rowsResult.error) {
    return err("Не вдалося завантажити рядки знімка.", "INTERNAL");
  }

  return ok({
    snapshot: snapshotResult.data as HouseDebtorMonthSnapshot,
    rows: (rowsResult.data ?? []) as HouseDebtorMonthRow[],
  });
}

async function getPublishedSnapshots(
  ctx: HandlerContext,
): Promise<Result<HouseDebtorMonthSnapshotWithRows[]>> {
  const snapshotsResult = await ctx.supabase
    .from("house_debtor_month_snapshots")
    .select("*")
    .eq("house_id", ctx.house.id)
    .eq("status", "published")
    .order("period_year", { ascending: true })
    .order("period_month", { ascending: true });

  if (snapshotsResult.error) {
    return err("Не вдалося завантажити історію боргів.", "INTERNAL");
  }

  const snapshots = (snapshotsResult.data ?? []) as HouseDebtorMonthSnapshot[];

  if (snapshots.length === 0) {
    return ok([]);
  }

  const rowsResult = await ctx.supabase
    .from("house_debtor_month_rows")
    .select("*")
    .eq("house_id", ctx.house.id)
    .in(
      "snapshot_id",
      snapshots.map((snapshot) => snapshot.id),
    )
    .order("account_number", { ascending: true });

  if (rowsResult.error) {
    return err("Не вдалося завантажити історичні рядки.", "INTERNAL");
  }

  const rowsBySnapshot = new Map<string, HouseDebtorMonthRow[]>();

  for (const row of (rowsResult.data ?? []) as HouseDebtorMonthRow[]) {
    const current = rowsBySnapshot.get(row.snapshot_id) ?? [];
    current.push(row);
    rowsBySnapshot.set(row.snapshot_id, current);
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
  const apartmentsResult = await ctx.supabase
    .from("house_apartments")
    .select("account_number")
    .eq("house_id", ctx.house.id)
    .is("archived_at", null);

  if (apartmentsResult.error) {
    return err("Не вдалося перевірити реєстр квартир.", "INTERNAL");
  }

  const imported = new Set(importedAccounts);
  const apartmentRows = (apartmentsResult.data ?? []) as {
    account_number: string;
  }[];

  const missing = apartmentRows
    .map((row) => normalizeText(row.account_number))
    .filter((accountNumber) => accountNumber && !imported.has(accountNumber))
    .sort((left, right) => left.localeCompare(right, "uk", { numeric: true }));

  return ok(missing);
}

export function mapDebtorHistoryRpcError(message: string): Result<never> {
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
