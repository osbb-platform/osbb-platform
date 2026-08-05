import type { Debtors1cImportState } from "./debtors1cImportState";

export type Debtors1cImportUploadRecoveryRow = {
  status: string;
  lock_version: number;
  confirmed_period_year: number | null;
  confirmed_period_month: number | null;
  stats: unknown;
};

function readSnapshotId(stats: unknown) {
  if (!stats || typeof stats !== "object") return null;

  const value = (stats as Record<string, unknown>).snapshotId;
  const snapshotId = String(value ?? "").trim();

  return snapshotId || null;
}

function readConfirmedPeriod(upload: Debtors1cImportUploadRecoveryRow) {
  const year = Number(upload.confirmed_period_year);
  const month = Number(upload.confirmed_period_month);

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

export function recoverTransferredDebtors1cImportState(
  state: Extract<Debtors1cImportState, { ok: true }>,
  upload: Debtors1cImportUploadRecoveryRow,
): Debtors1cImportState | null {
  if (upload.status !== "transferred") return null;

  const snapshotId = readSnapshotId(upload.stats);

  return {
    ...state,
    status: "transferred",
    lockVersion: Number(upload.lock_version),
    confirmedPeriod: readConfirmedPeriod(upload) ?? state.confirmedPeriod,
    ...(snapshotId ? { snapshotId } : {}),
    message: "Дані вже передано в чернетку боржників.",
  };
}

export function recoverConfirmedDebtors1cImportState(
  state: Extract<Debtors1cImportState, { ok: true }>,
  upload: Debtors1cImportUploadRecoveryRow,
  requestedPeriod: {
    year: number;
    month: number;
  },
): Debtors1cImportState | null {
  const transferred = recoverTransferredDebtors1cImportState(state, upload);
  if (transferred) return transferred;

  const confirmedPeriod = readConfirmedPeriod(upload);

  if (
    upload.status !== "confirmed" ||
    !confirmedPeriod ||
    confirmedPeriod.year !== requestedPeriod.year ||
    confirmedPeriod.month !== requestedPeriod.month
  ) {
    return null;
  }

  return {
    ...state,
    status: "confirmed",
    lockVersion: Number(upload.lock_version),
    confirmedPeriod,
    message: "Період уже підтверджено.",
  };
}
