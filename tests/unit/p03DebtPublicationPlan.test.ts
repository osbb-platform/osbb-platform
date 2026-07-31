
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildDebtPublicationPlan,
  type DebtorHistoryRow,
  type DebtorHistorySnapshot,
} from "../../src/modules/houses/debtors-history/buildDebtPublicationPlan";

function row(
  accountNumber: string,
  closingBalance: number,
): DebtorHistoryRow {
  return {
    apartmentId: null,
    accountNumber,
    apartmentLabel: accountNumber,
    ownerName: `Owner ${accountNumber}`,
    area: 50,
    accrued: null,
    paid: null,
    closingBalance,
    debtSourceValue: null,
  };
}

function snapshot(params: {
  id: string;
  year: number;
  month: number;
  revision?: number;
  status?: "draft" | "published";
  rows: DebtorHistoryRow[];
}): DebtorHistorySnapshot {
  return {
    id: params.id,
    periodYear: params.year,
    periodMonth: params.month,
    revision: params.revision ?? 1,
    status: params.status ?? "published",
    rows: params.rows,
  };
}

describe("buildDebtPublicationPlan", () => {
  it("recalculates later months after correcting a past month", () => {
    const plan = buildDebtPublicationPlan({
      publishedSnapshots: [
        snapshot({
          id: "jan",
          year: 2026,
          month: 1,
          rows: [row("A", -700)],
        }),
        snapshot({
          id: "feb-old",
          year: 2026,
          month: 2,
          rows: [row("A", -100)],
        }),
        snapshot({
          id: "mar",
          year: 2026,
          month: 3,
          rows: [row("A", -800)],
        }),
      ],
      targetSnapshot: snapshot({
        id: "feb-new",
        year: 2026,
        month: 2,
        revision: 2,
        status: "draft",
        rows: [row("A", -750)],
      }),
    });

    expect(
      plan.seriesRows.map((item) => [
        item.asOfMonth,
        item.monthsInDebt,
      ]),
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);

    expect(plan.publicItems).toEqual([
      expect.objectContaining({
        accountNumber: "A",
        amount: "-800",
        days: "3",
      }),
    ]);

    expect(plan.latestPeriod).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it("keeps the public threshold at exactly -500", () => {
    const plan = buildDebtPublicationPlan({
      publishedSnapshots: [],
      targetSnapshot: snapshot({
        id: "target",
        year: 2026,
        month: 1,
        status: "draft",
        rows: [
          row("included", -500),
          row("excluded", -499.99),
        ],
      }),
    });

    expect(plan.publicItems).toHaveLength(1);
    expect(plan.publicItems[0]).toMatchObject({
      accountNumber: "included",
      amount: "-500",
      days: "1",
    });
  });

  it("uses the latest published month for the public showcase", () => {
    const plan = buildDebtPublicationPlan({
      publishedSnapshots: [
        snapshot({
          id: "apr",
          year: 2026,
          month: 4,
          rows: [row("A", -900)],
        }),
      ],
      targetSnapshot: snapshot({
        id: "mar-revision",
        year: 2026,
        month: 3,
        revision: 2,
        status: "draft",
        rows: [row("A", -800)],
      }),
    });

    expect(plan.publicItems[0]).toMatchObject({
      accountNumber: "A",
      amount: "-900",
      days: "2",
    });
  });
});
