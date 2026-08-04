import type { ImportReconciliationResult } from "./workflowTypes";

export type BuildDebtorsMonthTransferResult =
  | {
      ok: true;
      rows: readonly {
        accountNumber: string;
        accrued: number | null;
        paid: number | null;
        closingBalance: number;
        debtSourceValue: number | null;
      }[];
    }
  | {
      ok: false;
      error: string;
    };

export function buildDebtorsMonthTransferRows(
  reconciliation: ImportReconciliationResult,
): BuildDebtorsMonthTransferResult {
  const dataRows = reconciliation.rows.filter(
    (row) => row.classification === "data",
  );

  if (dataRows.length === 0) {
    return {
      ok: false,
      error: "Файл не містить рядків для передачі.",
    };
  }

  const rows = [];

  for (const row of dataRows) {
    if (row.matchStatus !== "matched" || !row.matchedApartmentId) {
      continue;
    }

    if (row.source.osbbBalance === null) {
      return {
        ok: false,
        error: `Для рахунку ${row.source.accountNumberNormalized} відсутній борг.`,
      };
    }

    rows.push({
      accountNumber: row.source.accountNumberNormalized,
      accrued: row.source.accrued,
      paid: row.source.paid,
      closingBalance: row.source.osbbBalance,
      debtSourceValue: row.source.debtValue,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: "Файл не містить зіставлених рядків для передачі.",
    };
  }

  return {
    ok: true,
    rows,
  };
}
