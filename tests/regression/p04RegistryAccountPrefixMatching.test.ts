import { describe, expect, it } from "vitest";

import { reconcileDebtors1cRows } from "../../src/modules/import-buffer/matching";

function sourceRow(
  accountNumberRaw: string,
  accountNumberNormalized: string,
  apartmentLabel: string,
) {
  return {
    rowIndex: 40,
    classification: "data",
    value: {
      accountNumberRaw,
      accountNumberNormalized,
      apartmentLabel,
      ownerName: "Тестовий власник",
      area: 50,
      openingBalance: 0,
      accrued: 100,
      paid: 20,
      closingBalance: 80,
      debtValue: 80,
    },
  };
}

describe("P04 registry account normalization", () => {
  it("matches a normalized 1C account to a registry account with the л/с № prefix", () => {
    const result = reconcileDebtors1cRows(
      {
        period: { year: 2026, month: 7 },
        rows: [sourceRow("л/с №609740004", "609740004", "Кв. 4")],
      } as never,
      [
        {
          id: "apartment-4",
          accountNumber: "л/с №609740004",
          apartmentLabel: "Кв. 4",
          ownerName: "Тестовий власник",
          area: 50,
        },
      ],
    );

    expect(result.blocked).toBe(false);
    expect(result.matchedCount).toBe(1);
    expect(result.unknownSourceAccountNumbers).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      classification: "data",
      matchStatus: "matched",
      matchedApartmentId: "apartment-4",
    });
  });

  it("normalizes both sides before calculating missing registry accounts", () => {
    const result = reconcileDebtors1cRows(
      {
        period: { year: 2026, month: 7 },
        rows: [sourceRow("л/с №609740004", "609740004", "Кв. 4")],
      } as never,
      [
        {
          id: "apartment-4",
          accountNumber: "л/с №609740004",
          apartmentLabel: "Кв. 4",
          ownerName: "Тестовий власник",
          area: 50,
        },
      ],
    );

    expect(result.registryAccountsMissingFromFile).toEqual([]);
  });

  it("rejects duplicate registry accounts after normalization", () => {
    expect(() =>
      reconcileDebtors1cRows(
        {
          period: { year: 2026, month: 7 },
          rows: [sourceRow("л/с №609740004", "609740004", "Кв. 4")],
        } as never,
        [
          {
            id: "apartment-4-a",
            accountNumber: "л/с №609740004",
            apartmentLabel: "Кв. 4",
            ownerName: "A",
            area: 50,
          },
          {
            id: "apartment-4-b",
            accountNumber: "609740004",
            apartmentLabel: "Кв. 4B",
            ownerName: "B",
            area: 50,
          },
        ],
      ),
    ).toThrow("DUPLICATE_NORMALIZED_ACCOUNT_NUMBER:609740004");
  });

  it("keeps a genuinely unknown account blocked", () => {
    const result = reconcileDebtors1cRows(
      {
        period: { year: 2026, month: 7 },
        rows: [sourceRow("л/с №609740999", "609740999", "Кв. 999")],
      } as never,
      [
        {
          id: "apartment-4",
          accountNumber: "л/с №609740004",
          apartmentLabel: "Кв. 4",
          ownerName: "Тестовий власник",
          area: 50,
        },
      ],
    );

    expect(result.blocked).toBe(true);
    expect(result.matchedCount).toBe(0);
    expect(result.unknownSourceAccountNumbers).toEqual(["609740999"]);
  });
});
