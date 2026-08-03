import { describe, expect, it } from "vitest";

import { reconcileDebtors1cRows } from "../../src/modules/import-buffer/matching";
import { buildDebtorsMonthTransferRows } from "../../src/modules/import-buffer/debtors1cTransfer";
import type { ParsedRow } from "../../src/modules/import-buffer/types";
import type { Debtors1cRow } from "../../src/modules/import-buffer/adapters/debtors1c";
import type { ActiveApartmentRegistryRow } from "../../src/modules/import-buffer/workflowTypes";

function sourceRow(params: {
  rowIndex: number;
  account: string;
  apartment: string;
  owner: string;
  area: number;
  debt: number;
}): ParsedRow<Debtors1cRow> {
  return {
    rowIndex: params.rowIndex,
    classification: "data",
    value: {
      accountNumberRaw: `л/с №${params.account}`,
      accountNumberNormalized: params.account,
      apartmentLabel: params.apartment,
      ownerName: params.owner,
      area: params.area,
      openingBalance: null,
      accrued: null,
      paid: null,
      closingBalance: params.debt,
      debtValue: params.debt,
      osbbBalance: -params.debt,
    },
    warnings: [],
  };
}

describe("P04 account-based import for different houses", () => {
  const registry: ActiveApartmentRegistryRow[] = [
    {
      id: "apartment-a",
      accountNumber: "200023001",
      apartmentLabel: "1",
      ownerName: "Власник з реєстру 1",
      area: 87.19,
    },
    {
      id: "apartment-b",
      accountNumber: "200023004",
      apartmentLabel: "4",
      ownerName: "Власник з реєстру 4",
      area: 68.2,
    },
  ];

  it("places every amount into the apartment with the same account", () => {
    const reconciliation = reconcileDebtors1cRows(
      {
        period: {
          year: 2026,
          month: 7,
          sourceText: "за Липень 2026 р.",
        },
        rows: [
          sourceRow({
            rowIndex: 11,
            account: "200023001",
            apartment: "Кв. 1",
            owner: "Інший текст ПІБ",
            area: 87.2,
            debt: 610.33,
          }),
          sourceRow({
            rowIndex: 12,
            account: "200023004",
            apartment: "Кв. 4",
            owner: "Інший текст ПІБ 4",
            area: 68.2,
            debt: 17417.03,
          }),
        ],
      },
      registry,
    );

    expect(reconciliation.blocked).toBe(false);
    expect(reconciliation.matchedCount).toBe(2);
    expect(reconciliation.unknownSourceAccountNumbers).toEqual([]);

    const matchedRows = reconciliation.rows.filter(
      (row) => row.classification === "data",
    );

    expect(matchedRows).toHaveLength(2);

    expect(matchedRows[0]).toMatchObject({
      matchedApartmentId: "apartment-a",
      matchStatus: "matched",
      source: {
        accountNumberNormalized: "200023001",
        debtValue: 610.33,
        osbbBalance: -610.33,
      },
    });

    expect(matchedRows[1]).toMatchObject({
      matchedApartmentId: "apartment-b",
      matchStatus: "matched",
      source: {
        accountNumberNormalized: "200023004",
        debtValue: 17417.03,
        osbbBalance: -17417.03,
      },
    });

    const transfer = buildDebtorsMonthTransferRows(reconciliation);

    expect(transfer).toEqual({
      ok: true,
      rows: [
        {
          accountNumber: "200023001",
          accrued: null,
          paid: null,
          closingBalance: -610.33,
          debtSourceValue: 610.33,
        },
        {
          accountNumber: "200023004",
          accrued: null,
          paid: null,
          closingBalance: -17417.03,
          debtSourceValue: 17417.03,
        },
      ],
    });
  });

  it("blocks transfer when the file contains an unknown account", () => {
    const reconciliation = reconcileDebtors1cRows(
      {
        period: null,
        rows: [
          sourceRow({
            rowIndex: 11,
            account: "999999999",
            apartment: "Кв. 999",
            owner: "Невідомий",
            area: 1,
            debt: 500,
          }),
        ],
      },
      registry,
    );

    expect(reconciliation.blocked).toBe(true);
    expect(reconciliation.unknownSourceAccountNumbers).toEqual(["999999999"]);

    expect(buildDebtorsMonthTransferRows(reconciliation)).toEqual({
      ok: false,
      error: "Файл містить невідомі особові рахунки. Передача не виконана.",
    });
  });
});
