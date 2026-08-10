import { describe, expect, it } from "vitest";

import { debtors1cAdapter } from "../../src/modules/import-buffer/adapters/debtors1c";
import type { RawSheet } from "../../src/modules/import-buffer/types";

function buildSheet(
  marker: "(нежитлові)" | "(провайдери)",
): RawSheet {
  return {
    name: "TDSheet",
    rows: [
      [],
      ["", 'ОСББ "Тестовий будинок"'],
      [],
      ["", "Коротка зведена відомість за Травень 2026 р."],
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

      // Explicit special section aggregate.
      [
        "",
        `69000, м. Запоріжжя, Тестова ${marker}, № 1`,
        "",
        "",
        100,
        null,
        1000,
        100,
        0,
        1100,
        1100,
      ],

      // Exact T4 defect:
      // personal account + empty apartment/owner + numeric values.
      // It must stay in the explicit section and must NOT be treated
      // as structural residential aggregate.
      [
        "",
        "л/с №900001",
        "",
        "",
        20,
        null,
        500,
        50,
        0,
        550,
        550,
      ],

      // A normal row after the malformed/sparse personal-account row
      // must still remain in the same explicit section.
      [
        "",
        "л/с №900002",
        "Службове приміщення",
        "Службовий запис",
        30,
        null,
        700,
        70,
        0,
        770,
        770,
      ],

      // Real proven fixture shape:
      // an address/building aggregate without explicit special marker
      // legitimately starts the residential section.
      [
        "",
        "69000, м. Запоріжжя, Тестова, № 1",
        "",
        "",
        1000,
        null,
        10000,
        1000,
        500,
        10500,
        10500,
      ],

      [
        "",
        "л/с №100001",
        "Кв. 1",
        "Власник 1",
        50,
        null,
        100,
        20,
        10,
        110,
        110,
      ],

      ["", "Всього:"],
    ],
  };
}

describe("P10 T4 section heuristic lock", () => {
  it.each([
    {
      marker: "(нежитлові)" as const,
      specialClassification: "skip_group" as const,
    },
    {
      marker: "(провайдери)" as const,
      specialClassification: "skip_provider" as const,
    },
  ])(
    "keeps sparse personal accounts inside $marker until a real building aggregate",
    ({ marker, specialClassification }) => {
      const sheet = buildSheet(marker);
      const header = debtors1cAdapter.locateHeader(sheet);

      expect(header.ok).toBe(true);
      if (!header.ok) return;

      const rows = debtors1cAdapter.parseRows(sheet, header.value);

      const sparsePersonalAccount = rows.find(
        (row) => row.rowIndex === 11,
      );

      expect(sparsePersonalAccount?.classification).toBe(
        specialClassification,
      );

      const followingSpecialRow = rows.find(
        (row) => row.rowIndex === 12,
      );

      expect(followingSpecialRow?.classification).toBe(
        specialClassification,
      );

      const residential = rows.find(
        (row) =>
          row.classification === "data" &&
          row.value?.accountNumberNormalized === "100001",
      );

      expect(residential).toBeDefined();

      expect(
        rows.some(
          (row) =>
            row.classification === "data" &&
            ["900001", "900002"].includes(
              row.value?.accountNumberNormalized ?? "",
            ),
        ),
      ).toBe(false);
    },
  );
});
