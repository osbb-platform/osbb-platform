import { DEBTOR_MIN_BALANCE_UAH } from "./debtorsThreshold";

export type DebtorTotalsInput = {
  rows: readonly {
    accountNumber: string;
    closingBalance: number;
  }[];
  unmatchedDebtTotal?: number;
};

export type DebtorTotals = {
  saldo: number;
  totalDebt: number;
  totalCredit: number;
  debtorsCount: number;
  debtorsSum: number;
  saldoWithUnmatched: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeDebtorTotals(
  input: DebtorTotalsInput,
): DebtorTotals {
  let saldo = 0;
  let totalDebt = 0;
  let totalCredit = 0;
  let debtorsCount = 0;
  let debtorsSum = 0;

  for (const row of input.rows) {
    const balance = Number(row.closingBalance);

    if (!Number.isFinite(balance)) {
      continue;
    }

    saldo += balance;

    if (balance < 0) {
      totalDebt += Math.abs(balance);
    } else if (balance > 0) {
      totalCredit += balance;
    }

    if (balance <= DEBTOR_MIN_BALANCE_UAH) {
      debtorsCount += 1;
      debtorsSum += Math.abs(balance);
    }
  }

  const normalizedSaldo = roundMoney(saldo);
  const unmatchedDebtTotal = Number.isFinite(input.unmatchedDebtTotal)
    ? Number(input.unmatchedDebtTotal)
    : 0;

  return {
    saldo: normalizedSaldo,
    totalDebt: roundMoney(totalDebt),
    totalCredit: roundMoney(totalCredit),
    debtorsCount,
    debtorsSum: roundMoney(debtorsSum),
    saldoWithUnmatched: roundMoney(
      normalizedSaldo + unmatchedDebtTotal,
    ),
  };
}
