
import {
  computeDebtSeries,
  type DebtSeriesSnapshotInput,
  type DebtSeriesSnapshotStatus,
} from "./computeDebtSeries";

export type DebtorHistoryRow = {
  apartmentId: string | null;
  accountNumber: string;
  apartmentLabel: string;
  ownerName: string;
  area: number | null;
  accrued: number | null;
  paid: number | null;
  closingBalance: number;
  debtSourceValue: number | null;
};

export type DebtorHistorySnapshot = {
  id: string;
  periodYear: number;
  periodMonth: number;
  revision: number;
  status: DebtSeriesSnapshotStatus;
  rows: readonly DebtorHistoryRow[];
};

export type DebtSeriesPersistenceRow = {
  accountNumber: string;
  asOfYear: number;
  asOfMonth: number;
  monthsInDebt: number;
  seriesBroken: boolean;
  latestBalance: number;
};

export type DebtPublicationPlan = {
  expectedPublishedSnapshotIds: string[];
  seriesRows: DebtSeriesPersistenceRow[];
  latestPeriod: {
    year: number;
    month: number;
  };
};

function periodOrdinal(year: number, month: number) {
  return year * 12 + month - 1;
}

function compareSnapshots(
  left: DebtorHistorySnapshot,
  right: DebtorHistorySnapshot,
) {
  const periodDelta =
    periodOrdinal(left.periodYear, left.periodMonth) -
    periodOrdinal(right.periodYear, right.periodMonth);

  if (periodDelta !== 0) {
    return periodDelta;
  }

  return left.revision - right.revision;
}

export function formatDebtorBalance(value: number) {
  const fixed = value.toFixed(2);

  if (fixed.endsWith(".00")) {
    return fixed.slice(0, -3);
  }

  if (fixed.endsWith("0")) {
    return fixed.slice(0, -1);
  }

  return fixed;
}

function toSeriesInput(
  snapshot: DebtorHistorySnapshot,
): DebtSeriesSnapshotInput {
  return {
    periodYear: snapshot.periodYear,
    periodMonth: snapshot.periodMonth,
    revision: snapshot.revision,
    status: snapshot.status,
    rows: snapshot.rows.map((row) => ({
      accountNumber: row.accountNumber,
      closingBalance: row.closingBalance,
    })),
  };
}

export function buildDebtPublicationPlan(params: {
  publishedSnapshots: readonly DebtorHistorySnapshot[];
  targetSnapshot: DebtorHistorySnapshot;
}): DebtPublicationPlan {
  const { publishedSnapshots, targetSnapshot } = params;

  if (targetSnapshot.status !== "draft") {
    throw new Error("Only a draft debtor snapshot can be published.");
  }

  if (targetSnapshot.rows.length === 0) {
    throw new Error("A debtor snapshot must contain at least one row.");
  }

  if (
    publishedSnapshots.some(
      (snapshot) => snapshot.status !== "published",
    )
  ) {
    throw new Error(
      "Publication planning accepts only published snapshots as history.",
    );
  }

  const prospectiveSnapshots = publishedSnapshots
    .filter(
      (snapshot) =>
        snapshot.periodYear !== targetSnapshot.periodYear ||
        snapshot.periodMonth !== targetSnapshot.periodMonth,
    )
    .concat({
      ...targetSnapshot,
      status: "published",
    })
    .sort(compareSnapshots);

  const seriesRows = computeDebtSeries(
    prospectiveSnapshots.map(toSeriesInput),
  );

  const latestSnapshot = prospectiveSnapshots.at(-1);

  if (!latestSnapshot) {
    throw new Error("Unable to determine the latest debtor period.");
  }


  return {
    expectedPublishedSnapshotIds: publishedSnapshots
      .map((snapshot) => snapshot.id)
      .sort(),
    seriesRows,
    latestPeriod: {
      year: latestSnapshot.periodYear,
      month: latestSnapshot.periodMonth,
    },
  };
}
