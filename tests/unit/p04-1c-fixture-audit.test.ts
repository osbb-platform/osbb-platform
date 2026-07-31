import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/1c/Соборний,186.xls",
);

function asText(value: unknown): string {
  return String(value ?? "").trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = asText(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric cell, received: ${String(value)}`);
  }

  return parsed;
}

describe("P04 T1 raw 1C fixture evidence", () => {
  it("keeps the approved source file unchanged", () => {
    const fixture = readFileSync(fixturePath);

    expect(fixture.byteLength).toBe(55_808);
    expect(createHash("sha256").update(fixture).digest("hex")).toBe(
      "0c9dbdcf6c57ea9e46109f8dc8c68cc3668473c1c9fcd7284b156c8ff5df2ff8",
    );
  });

  it("proves workbook shape, period, headers and source groups", () => {
    const workbook = XLSX.readFile(fixturePath, {
      cellDates: false,
      dense: true,
      raw: true,
    });

    expect(workbook.SheetNames).toEqual(["TDSheet"]);

    const sheet = workbook.Sheets.TDSheet;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    expect(rows).toHaveLength(174);
    expect(rows[0]?.every((cell) => cell === null)).toBe(true);
    expect(rows[3]?.map(asText).join(" ")).toContain(
      "Коротка зведена відомість за Травень 2026 р.",
    );

    expect(rows[8]?.map(asText)).toEqual(
      expect.arrayContaining([
        "Будівля",
        "Площа",
        "Кіл-сть мешк.",
        "Сума на початок місяця",
        "Разом нараховано",
        "Разом сплачено",
        "Сума на кінець місяця",
        "Борг",
      ]),
    );

    expect(rows[9]?.map(asText)).toEqual(
      expect.arrayContaining([
        "Особ.рахунок",
        "Кв-ра",
        "Квартиронаймач",
      ]),
    );

    const allText = rows.flat().map(asText);

    expect(
      allText.some((value) => value.includes("(нежитлові)")),
    ).toBe(true);
    expect(
      allText.some((value) => value.includes("(провайдери)")),
    ).toBe(true);
    expect(allText).toContain("Всього:");
  });

  it("proves source counts and residential control totals", () => {
    const workbook = XLSX.readFile(fixturePath, {
      cellDates: false,
      dense: true,
      raw: true,
    });
    const sheet = workbook.Sheets.TDSheet;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    type Group = "none" | "non_residential" | "providers" | "residential";
    let group: Group = "none";

    const residentialRows: unknown[][] = [];
    const allAccountRows: unknown[][] = [];
    let providerOrMzkCount = 0;
    let nonResidentialCount = 0;
    let groupCount = 0;
    let totalCount = 0;

    for (const row of rows) {
      const text = row.map(asText).filter(Boolean).join(" ");

      if (text.startsWith("Всього:")) {
        totalCount += 1;
        continue;
      }

      if (
        text.includes("м.Запоріжжя") &&
        text.includes("пр.Соборний") &&
        text.includes("№ 186")
      ) {
        groupCount += 1;

        if (text.includes("(нежитлові)")) {
          group = "non_residential";
        } else if (text.includes("(провайдери)")) {
          group = "providers";
        } else {
          group = "residential";
        }

        continue;
      }

      const account = asText(row[1]);
      if (!account.startsWith("л/с")) {
        continue;
      }

      allAccountRows.push(row);
      const apartment = asText(row[2]);

      if (group === "non_residential") {
        nonResidentialCount += 1;
      } else if (group === "providers" || apartment.startsWith("МЗК")) {
        providerOrMzkCount += 1;
      } else if (group === "residential") {
        residentialRows.push(row);
      }
    }

    expect(groupCount).toBe(3);
    expect(totalCount).toBe(1);
    expect(allAccountRows).toHaveLength(159);
    expect(nonResidentialCount).toBe(20);
    expect(providerOrMzkCount).toBe(7);
    expect(residentialRows).toHaveLength(132);

    const sums = residentialRows.reduce(
      (acc, row) => ({
        area: acc.area + asNumber(row[4]),
        opening: acc.opening + asNumber(row[6]),
        accrued: acc.accrued + asNumber(row[7]),
        paid: acc.paid + asNumber(row[8]),
        closing: acc.closing + asNumber(row[9]),
        debt: acc.debt + asNumber(row[10]),
      }),
      {
        area: 0,
        opening: 0,
        accrued: 0,
        paid: 0,
        closing: 0,
        debt: 0,
      },
    );

    expect(sums.area).toBeCloseTo(8210.25, 2);
    expect(sums.opening).toBeCloseTo(446699.57, 2);
    expect(sums.accrued).toBeCloseTo(57393.38, 2);
    expect(sums.paid).toBeCloseTo(41947.59, 2);
    expect(sums.closing).toBeCloseTo(462145.36, 2);
    expect(sums.debt).toBeCloseTo(404751.98, 2);
  });

  it("proves that debt and closing balance are independent columns", () => {
    const workbook = XLSX.readFile(fixturePath, {
      cellDates: false,
      dense: true,
      raw: true,
    });
    const sheet = workbook.Sheets.TDSheet;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const differingRows = rows.filter((row) => {
      const account = asText(row[1]);
      if (!account.startsWith("л/с")) {
        return false;
      }

      const closing = row[9];
      const debt = row[10];
      return typeof closing === "number" &&
        typeof debt === "number" &&
        closing !== debt;
    });

    expect(differingRows.length).toBeGreaterThan(0);
    expect(
      differingRows.some(
        (row) => asNumber(row[9]) === 0 && asNumber(row[10]) === -375.97,
      ),
    ).toBe(true);
  });
});
