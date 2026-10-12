import type {
  ImportMatchStatus,
  ImportRowClassification,
} from "./types";

export type Debtors1cImportCounters = {
  sourceRows: number;
  registryRows: number;
  classifiedRows: number;
  unclassifiedRows: number;
  technicalExcludedRows: number;
  dataRows: number;
  matchedRows: number;
  unmatchedRows: number;
  missingDebtRows: number;
  transferableRows: number;
  persistedRows: number | null;
};

export type Debtors1cCounterRow = {
  classification: ImportRowClassification;
  match_status: ImportMatchStatus;
  matched_apartment_id: string | null;
  account_number_normalized: string | null;
  debt_value: number | null;
};

export function buildDebtors1cImportCounters(params: {
  sourceRows: number;
  registryRows?: number;
  rows: readonly Debtors1cCounterRow[];
  persistedRows?: number | null;
}): Debtors1cImportCounters {
  let dataRows = 0;
  let matchedRows = 0;
  let unmatchedRows = 0;
  let missingDebtRows = 0;
  let transferableRows = 0;

  for (const row of params.rows) {
    if (row.classification !== "data") continue;

    dataRows += 1;

    const matched =
      row.match_status === "matched" &&
      Boolean(row.matched_apartment_id) &&
      Boolean(row.account_number_normalized);

    if (!matched) {
      unmatchedRows += 1;
      continue;
    }

    matchedRows += 1;

    if (row.debt_value === null) {
      missingDebtRows += 1;
      continue;
    }

    transferableRows += 1;
  }

  return {
    sourceRows: Math.max(0, Math.trunc(params.sourceRows)),
    registryRows: Math.max(0, Math.trunc(params.registryRows ?? 0)),
    classifiedRows: params.rows.length,
    unclassifiedRows: Math.max(
      0,
      Math.trunc(params.sourceRows) - params.rows.length,
    ),
    technicalExcludedRows: params.rows.length - dataRows,
    dataRows,
    matchedRows,
    unmatchedRows,
    missingDebtRows,
    transferableRows,
    persistedRows: params.persistedRows ?? null,
  };
}

export function resolveStoredConfirmedPeriod(value: {
  confirmed_period_year: unknown;
  confirmed_period_month: unknown;
}) {
  const year = Number(value.confirmed_period_year);
  const month = Number(value.confirmed_period_month);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

export function readStoredImportCounters(
  stats: unknown,
): Debtors1cImportCounters | null {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return null;
  }

  const raw = (stats as Record<string, unknown>).counters;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const numericKeys = [
    "sourceRows",
    "registryRows",
    "classifiedRows",
    "unclassifiedRows",
    "technicalExcludedRows",
    "dataRows",
    "matchedRows",
    "unmatchedRows",
    "missingDebtRows",
    "transferableRows",
  ] as const;

  for (const key of numericKeys) {
    const candidate = value[key];
    if (
      typeof candidate !== "number" ||
      !Number.isInteger(candidate) ||
      candidate < 0
    ) {
      return null;
    }
  }

  const persistedRows = value.persistedRows;
  if (
    persistedRows !== null &&
    persistedRows !== undefined &&
    (typeof persistedRows !== "number" ||
      !Number.isInteger(persistedRows) ||
      Number(persistedRows) < 0)
  ) {
    return null;
  }

  return {
    sourceRows: Number(value.sourceRows),
    registryRows: Number(value.registryRows),
    classifiedRows: Number(value.classifiedRows),
    unclassifiedRows: Number(value.unclassifiedRows),
    technicalExcludedRows: Number(value.technicalExcludedRows),
    dataRows: Number(value.dataRows),
    matchedRows: Number(value.matchedRows),
    unmatchedRows: Number(value.unmatchedRows),
    missingDebtRows: Number(value.missingDebtRows),
    transferableRows: Number(value.transferableRows),
    persistedRows:
      persistedRows === null || persistedRows === undefined
        ? null
        : Number(persistedRows),
  };
}
