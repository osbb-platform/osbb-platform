import {
  describe,
  expect,
  it,
} from "vitest";

import {
  computeDebtSeries,
  type DebtSeriesSnapshotInput,
  type DebtSeriesSnapshotStatus,
} from "../../src/modules/houses/debtors-history/computeDebtSeries";

type RowTuple = readonly [
  accountNumber: string,
  closingBalance: number,
];

function snapshot(
  year: number,
  month: number,
  rows: readonly RowTuple[],
  status: DebtSeriesSnapshotStatus = "published",
  revision = 1,
): DebtSeriesSnapshotInput {
  return {
    periodYear: year,
    periodMonth: month,
    revision,
    status,
    rows: rows.map(
      ([accountNumber, closingBalance]) => ({
        accountNumber,
        closingBalance,
      }),
    ),
  };
}

describe("computeDebtSeries", () => {
  it("counts a continuous debt series at the -500 boundary", () => {
    const result = computeDebtSeries([
      snapshot(2026, 1, [["A-1", -500]]),
      snapshot(2026, 2, [["A-1", -650]]),
      snapshot(2026, 3, [["A-1", -499.99]]),
      snapshot(2026, 4, [["A-1", -500]]),
    ]);

    expect(result).toEqual([
      {
        accountNumber: "A-1",
        asOfYear: 2026,
        asOfMonth: 1,
        monthsInDebt: 1,
        seriesBroken: false,
        latestBalance: -500,
      },
      {
        accountNumber: "A-1",
        asOfYear: 2026,
        asOfMonth: 2,
        monthsInDebt: 2,
        seriesBroken: false,
        latestBalance: -650,
      },
      {
        accountNumber: "A-1",
        asOfYear: 2026,
        asOfMonth: 3,
        monthsInDebt: 0,
        seriesBroken: false,
        latestBalance: -499.99,
      },
      {
        accountNumber: "A-1",
        asOfYear: 2026,
        asOfMonth: 4,
        monthsInDebt: 1,
        seriesBroken: false,
        latestBalance: -500,
      },
    ]);
  });

  it("breaks the series when a calendar month is missing", () => {
    const result = computeDebtSeries([
      snapshot(2026, 1, [["A-1", -700]]),
      snapshot(2026, 3, [["A-1", -800]]),
      snapshot(2026, 4, [["A-1", -900]]),
    ]);

    expect(
      result.map((point) => ({
        month: point.asOfMonth,
        months: point.monthsInDebt,
        broken: point.seriesBroken,
      })),
    ).toEqual([
      { month: 1, months: 1, broken: false },
      { month: 3, months: 1, broken: true },
      { month: 4, months: 2, broken: false },
    ]);
  });

  it("breaks the series when an account is absent", () => {
    const result = computeDebtSeries([
      snapshot(2026, 1, [
        ["A-1", -700],
        ["B-1", -700],
      ]),
      snapshot(2026, 2, [
        ["B-1", -750],
      ]),
      snapshot(2026, 3, [
        ["A-1", -800],
        ["B-1", -800],
      ]),
    ]);

    const accountA = result.filter(
      (point) => point.accountNumber === "A-1",
    );

    const accountB = result.filter(
      (point) => point.accountNumber === "B-1",
    );

    expect(
      accountA.map((point) => ({
        month: point.asOfMonth,
        months: point.monthsInDebt,
        broken: point.seriesBroken,
      })),
    ).toEqual([
      { month: 1, months: 1, broken: false },
      { month: 3, months: 1, broken: true },
    ]);

    expect(
      accountB.map((point) => ({
        month: point.asOfMonth,
        months: point.monthsInDebt,
        broken: point.seriesBroken,
      })),
    ).toEqual([
      { month: 1, months: 1, broken: false },
      { month: 2, months: 2, broken: false },
      { month: 3, months: 3, broken: false },
    ]);
  });

  it("marks a late first appearance as incomplete", () => {
    const result = computeDebtSeries([
      snapshot(2026, 1, [["A-1", -700]]),
      snapshot(2026, 2, [["B-1", -800]]),
    ]);

    expect(result.at(-1)).toEqual({
      accountNumber: "B-1",
      asOfYear: 2026,
      asOfMonth: 2,
      monthsInDebt: 1,
      seriesBroken: true,
      latestBalance: -800,
    });
  });

  it("ignores non-published snapshots", () => {
    const result = computeDebtSeries([
      snapshot(2026, 1, [["A-1", -700]]),
      snapshot(
        2026,
        2,
        [["A-1", -750]],
        "superseded",
      ),
      snapshot(
        2026,
        2,
        [["A-1", -760]],
        "draft",
        2,
      ),
      snapshot(
        2026,
        2,
        [["A-1", -770]],
        "discarded",
        3,
      ),
      snapshot(2026, 3, [["A-1", -800]]),
    ]);

    expect(result).toHaveLength(2);

    expect(result[1]).toMatchObject({
      asOfMonth: 3,
      monthsInDebt: 1,
      seriesBroken: true,
    });
  });

  it("sorts snapshots before calculating", () => {
    const result = computeDebtSeries([
      snapshot(2026, 3, [["A-1", -900]]),
      snapshot(2026, 1, [["A-1", -700]]),
      snapshot(2026, 2, [["A-1", -800]]),
    ]);

    expect(
      result.map((point) => [
        point.asOfMonth,
        point.monthsInDebt,
      ]),
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("rejects duplicate published periods", () => {
    expect(() =>
      computeDebtSeries([
        snapshot(
          2026,
          1,
          [["A-1", -700]],
          "published",
          1,
        ),
        snapshot(
          2026,
          1,
          [["A-1", -800]],
          "published",
          2,
        ),
      ]),
    ).toThrow(
      "Published debtor snapshots must have unique periods.",
    );
  });

  it("rejects duplicate accounts inside a snapshot", () => {
    expect(() =>
      computeDebtSeries([
        snapshot(2026, 1, [
          ["A-1", -700],
          ["A-1", -800],
        ]),
      ]),
    ).toThrow(
      "Duplicate debtor account in snapshot: A-1",
    );
  });
});
