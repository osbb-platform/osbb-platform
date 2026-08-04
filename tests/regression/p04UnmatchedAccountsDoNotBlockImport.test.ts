import { describe, expect, it } from "vitest";

import { reconcileDebtors1cRows } from "../../src/modules/import-buffer/matching";
import { buildDebtorsMonthTransferRows } from "../../src/modules/import-buffer/debtors1cTransfer";

describe("P04 partial import with unmatched source accounts", () => {
  it("keeps unmatched rows in preview but does not block matched rows", () => {
    const result = reconcileDebtors1cRows(
      {
        period: { year: 2026, month: 7 },
        rows: [
          {
            rowIndex: 40,
            classification: "data",
            value: {
              accountNumberRaw: "л/с №609740004",
              accountNumberNormalized: "609740004",
              apartmentLabel: "Кв. 4",
              ownerName: "Власник 4",
              area: 50,
              openingBalance: 0,
              accrued: 100,
              paid: 20,
              closingBalance: 80,
              debtValue: 80,
            },
          },
          {
            rowIndex: 171,
            classification: "data",
            value: {
              accountNumberRaw: "л/с №609740999",
              accountNumberNormalized: "609740999",
              apartmentLabel: "Кв. 999",
              ownerName: "Технічний рахунок",
              area: null,
              openingBalance: 0,
              accrued: 25,
              paid: 0,
              closingBalance: 25,
              debtValue: 25,
            },
          },
        ],
      } as never,
      [
        {
          id: "apartment-4",
          accountNumber: "л/с №609740004",
          apartmentLabel: "Кв. 4",
          ownerName: "Власник 4",
          area: 50,
        },
      ],
    );

    expect(result.blocked).toBe(false);
    expect(result.matchedCount).toBe(1);
    expect(result.unknownSourceAccountNumbers).toEqual(["609740999"]);

    const transfer = buildDebtorsMonthTransferRows(result);
    expect(transfer.ok).toBe(true);

    if (transfer.ok) {
      expect(transfer.rows).toHaveLength(1);
      expect(transfer.rows[0]).toMatchObject({
        accountNumber: "609740004",
      });
    }

    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowIndex: 40,
          matchStatus: "matched",
          matchedApartmentId: "apartment-4",
        }),
        expect.objectContaining({
          rowIndex: 171,
          matchStatus: "unmatched",
        }),
      ]),
    );
  });
});
