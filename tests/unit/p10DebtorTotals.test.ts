import { describe, expect, it } from "vitest";

import {
  computeDebtorTotals,
  type DebtorTotalsInput,
} from "../../src/modules/houses/utils/computeDebtorTotals";

describe("P10 T5 debtor totals", () => {
  it("separates algebraic saldo, all debt, credit and threshold debtors", () => {
    const input: DebtorTotalsInput = {
      rows: [
        { accountNumber: "1", closingBalance: -1000 },
        { accountNumber: "2", closingBalance: -499.99 },
        { accountNumber: "3", closingBalance: -500 },
        { accountNumber: "4", closingBalance: 250 },
        { accountNumber: "5", closingBalance: 0 },
      ],
    };

    expect(computeDebtorTotals(input)).toEqual({
      saldo: -1749.99,
      totalDebt: 1999.99,
      totalCredit: 250,
      debtorsCount: 2,
      debtorsSum: 1500,
      saldoWithUnmatched: -1749.99,
    });
  });

  it("adds signed unmatched value only to reconciliation saldo", () => {
    expect(
      computeDebtorTotals({
        rows: [
          { accountNumber: "1", closingBalance: -1000 },
          { accountNumber: "2", closingBalance: 200 },
        ],
        unmatchedDebtTotal: -300,
      }),
    ).toEqual({
      saldo: -800,
      totalDebt: 1000,
      totalCredit: 200,
      debtorsCount: 1,
      debtorsSum: 1000,
      saldoWithUnmatched: -1100,
    });
  });

  it("keeps sub-threshold debt in totalDebt but not debtor count/sum", () => {
    const totals = computeDebtorTotals({
      rows: [
        { accountNumber: "1", closingBalance: -100 },
        { accountNumber: "2", closingBalance: -499.99 },
      ],
    });

    expect(totals.totalDebt).toBe(599.99);
    expect(totals.debtorsCount).toBe(0);
    expect(totals.debtorsSum).toBe(0);
  });

  it("rounds monetary aggregates to cents", () => {
    const totals = computeDebtorTotals({
      rows: [
        { accountNumber: "1", closingBalance: -0.1 },
        { accountNumber: "2", closingBalance: -0.2 },
        { accountNumber: "3", closingBalance: 0.3 },
      ],
    });

    expect(totals.saldo).toBe(0);
    expect(totals.totalDebt).toBe(0.3);
    expect(totals.totalCredit).toBe(0.3);
  });
});
