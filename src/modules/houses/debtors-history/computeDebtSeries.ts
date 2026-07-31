import { DEBTOR_MIN_BALANCE_UAH } from "../utils/debtorsThreshold";

export type DebtSeriesSnapshotStatus =
  | "draft"
  | "published"
  | "superseded"
  | "discarded";

export type DebtSeriesSnapshotRow = {
  accountNumber: string;
  closingBalance: number;
};

export type DebtSeriesSnapshotInput = {
  periodYear: number;
  periodMonth: number;
  revision: number;
  status: DebtSeriesSnapshotStatus;
  rows: readonly DebtSeriesSnapshotRow[];
};

export type DebtSeriesPoint = {
  accountNumber: string;
  asOfYear: number;
  asOfMonth: number;
  monthsInDebt: number;
  seriesBroken: boolean;
  latestBalance: number;
};

type AccountSeriesState = {
  monthsInDebt: number;
  lastSnapshotIndex: number;
};

function getPeriodOrdinal(year: number, month: number) {
  return year * 12 + month - 1;
}

function compareSnapshots(
  left: DebtSeriesSnapshotInput,
  right: DebtSeriesSnapshotInput,
) {
  const leftPeriod = getPeriodOrdinal(
    left.periodYear,
    left.periodMonth,
  );

  const rightPeriod = getPeriodOrdinal(
    right.periodYear,
    right.periodMonth,
  );

  if (leftPeriod !== rightPeriod) {
    return leftPeriod - rightPeriod;
  }

  return left.revision - right.revision;
}

export function computeDebtSeries(
  snapshots: readonly DebtSeriesSnapshotInput[],
): DebtSeriesPoint[] {
  const publishedSnapshots = snapshots
    .filter((snapshot) => snapshot.status === "published")
    .sort(compareSnapshots);

  const accountStates = new Map<
    string,
    AccountSeriesState
  >();

  const result: DebtSeriesPoint[] = [];

  let previousPeriodOrdinal: number | null = null;

  publishedSnapshots.forEach((snapshot, snapshotIndex) => {
    const currentPeriodOrdinal = getPeriodOrdinal(
      snapshot.periodYear,
      snapshot.periodMonth,
    );

    if (
      previousPeriodOrdinal !== null &&
      currentPeriodOrdinal === previousPeriodOrdinal
    ) {
      throw new Error(
        "Published debtor snapshots must have unique periods.",
      );
    }

    const housePeriodGap =
      previousPeriodOrdinal !== null &&
      currentPeriodOrdinal !== previousPeriodOrdinal + 1;

    const snapshotAccounts = new Set<string>();

    snapshot.rows.forEach((row) => {
      if (snapshotAccounts.has(row.accountNumber)) {
        throw new Error(
          `Duplicate debtor account in snapshot: ${row.accountNumber}`,
        );
      }

      snapshotAccounts.add(row.accountNumber);

      const previousState = accountStates.get(
        row.accountNumber,
      );

      const accountWasMissing =
        previousState === undefined
          ? snapshotIndex > 0
          : previousState.lastSnapshotIndex !==
            snapshotIndex - 1;

      const seriesBroken =
        housePeriodGap || accountWasMissing;

      const isInDebt =
        row.closingBalance <= DEBTOR_MIN_BALANCE_UAH;

      const monthsInDebt = isInDebt
        ? seriesBroken
          ? 1
          : (previousState?.monthsInDebt ?? 0) + 1
        : 0;

      result.push({
        accountNumber: row.accountNumber,
        asOfYear: snapshot.periodYear,
        asOfMonth: snapshot.periodMonth,
        monthsInDebt,
        seriesBroken,
        latestBalance: row.closingBalance,
      });

      accountStates.set(row.accountNumber, {
        monthsInDebt,
        lastSnapshotIndex: snapshotIndex,
      });
    });

    previousPeriodOrdinal = currentPeriodOrdinal;
  });

  return result;
}
