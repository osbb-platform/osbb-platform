import { describe, expect, it } from "vitest";

import { debtors1cAdapter } from "../../src/modules/import-buffer/adapters/debtors1c";
import type { RawSheet } from "../../src/modules/import-buffer/types";

const differentHouseSheet: RawSheet = {
  name: "TDSheet",
  rows: [
    [],
    ["", 'ОСББ "Чарівна 34"'],
    [],
    ["", "Краткая сводная ведомость за Июль 2026 г."],
    [],
    ["", "По всіх об'єктах"],
    ["", "Всі квартири"],
    [],
    [
      "",
      "Будівля",
      "",
      "",
      "Площа",
      "Кіл-сть мешк.",
      "Сума на початок місяця",
      "Разом нараховано",
      "Разом сплачено",
      "Сума на кінець місяця",
      "Борг",
    ],
    ["", "Особ.рахунок", "Кв-ра", "Квартиронаймач"],
    [
      "",
      "69071, м. Запоріжжя, Чарівна, № 34",
      "",
      "",
      6291.11,
      null,
      126599.71,
      44037.77,
      41499.96,
      129137.52,
      85099.75,
    ],
    [
      "",
      "л/с №200023001",
      "Кв. 1",
      "Власник 1",
      87.19,
      null,
      610.33,
      610.33,
      610.33,
      610.33,
      0,
    ],
    [
      "",
      "л/с №200023004",
      "Кв. 4",
      "Власник 4",
      68.2,
      null,
      17000,
      1000,
      114.95,
      17885.05,
      17417.03,
    ],
    ["", "Всього"],
  ],
};

describe("P04 different-house 1C format", () => {
  it("does not depend on the Sobornyi 186 address", () => {
    expect(debtors1cAdapter.detect(differentHouseSheet).matched).toBe(true);

    const header = debtors1cAdapter.locateHeader(differentHouseSheet);

    expect(header.ok).toBe(true);

    if (!header.ok) return;

    const rows = debtors1cAdapter
      .parseRows(differentHouseSheet, header.value)
      .filter((row) => row.classification === "data");

    expect(rows).toHaveLength(2);

    const apartmentFour = rows.find(
      (row) => row.value?.apartmentLabel === "Кв. 4",
    );

    expect(apartmentFour?.value).toMatchObject({
      closingBalance: 17885.05,
      debtValue: 17417.03,
      osbbBalance: -17417.03,
    });
  });

  it("uses the last Debt column for OSBB history", () => {
    const header = debtors1cAdapter.locateHeader(differentHouseSheet);

    expect(header.ok).toBe(true);
    if (!header.ok) return;

    const rows = debtors1cAdapter
      .parseRows(differentHouseSheet, header.value)
      .filter((row) => row.classification === "data");

    const sourceDebt = rows.reduce(
      (sum, row) => sum + (row.value?.debtValue ?? 0),
      0,
    );

    const osbbBalance = rows.reduce(
      (sum, row) => sum + (row.value?.osbbBalance ?? 0),
      0,
    );

    expect(sourceDebt).toBeCloseTo(17417.03, 2);
    expect(osbbBalance).toBeCloseTo(-17417.03, 2);
  });
});
