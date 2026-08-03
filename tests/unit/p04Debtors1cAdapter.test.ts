import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  debtors1cAdapter,
  toOsbbBalance,
} from "../../src/modules/import-buffer/adapters/debtors1c";
import { runImportPipeline } from "../../src/modules/import-buffer/pipeline";
import { registerBuiltInImportAdapters } from "../../src/modules/import-buffer/registerBuiltInAdapters";
import { resetImportAdapterRegistryForTests } from "../../src/modules/import-buffer/registry";
import type { RawSheet } from "../../src/modules/import-buffer/types";
import type { Debtors1cRow } from "../../src/modules/import-buffer/adapters/debtors1c";

function loadFixtureSheet(): RawSheet {
  const fixture = join(process.cwd(), "tests/fixtures/1c/Соборний,186.xls");

  const workbook = XLSX.read(readFileSync(fixture), {
    type: "buffer",
    raw: true,
    cellDates: false,
    dense: true,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return {
    name: sheetName,
    rows: XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
    }),
  };
}

describe("P04 debtors_1c adapter", () => {
  it("detects the real fixture and extracts May 2026", () => {
    const sheet = loadFixtureSheet();

    expect(debtors1cAdapter.detect(sheet)).toEqual({
      matched: true,
      confidence: 100,
      reason: undefined,
    });

    expect(debtors1cAdapter.extractPeriod(sheet)).toEqual({
      year: 2026,
      month: 5,
      sourceText: "за Травень 2026 р.",
    });
  });

  it("locates the proven two-row header", () => {
    const sheet = loadFixtureSheet();
    const result = debtors1cAdapter.locateHeader(sheet);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.rowIndex).toBe(9);
    expect(result.value.columns).toMatchObject({
      account: 1,
      apartment: 2,
      owner: 3,
      area: 4,
      opening: 6,
      accrued: 7,
      paid: 8,
      closing: 9,
      debt: 10,
    });
  });

  it("classifies fixture rows and preserves control totals", () => {
    const sheet = loadFixtureSheet();
    const headerResult = debtors1cAdapter.locateHeader(sheet);

    expect(headerResult.ok).toBe(true);

    if (!headerResult.ok) {
      return;
    }

    const rows = debtors1cAdapter.parseRows(sheet, headerResult.value);

    const dataRows = rows.filter((row) => row.classification === "data");

    expect(dataRows).toHaveLength(132);

    expect(
      rows.filter((row) => row.classification === "skip_provider"),
    ).toHaveLength(8);

    expect(
      rows.filter((row) => row.classification === "skip_group"),
    ).toHaveLength(22);

    expect(
      rows.filter((row) => row.classification === "skip_total"),
    ).toHaveLength(1);

    const values = dataRows.map((row) => {
      expect(row.value).not.toBeNull();
      return row.value as Debtors1cRow;
    });

    const sums = values.reduce(
      (acc, row) => ({
        area: acc.area + (row.area ?? 0),
        opening: acc.opening + (row.openingBalance ?? 0),
        accrued: acc.accrued + (row.accrued ?? 0),
        paid: acc.paid + (row.paid ?? 0),
        closing: acc.closing + (row.closingBalance ?? 0),
        debt: acc.debt + (row.debtValue ?? 0),
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

  it("normalizes account numbers without inventing leading zeros", () => {
    const sheet = loadFixtureSheet();
    const headerResult = debtors1cAdapter.locateHeader(sheet);

    expect(headerResult.ok).toBe(true);

    if (!headerResult.ok) {
      return;
    }

    const rows = debtors1cAdapter.parseRows(sheet, headerResult.value);

    const values = rows
      .filter((row) => row.classification === "data")
      .map((row) => row.value as Debtors1cRow);

    expect(
      values.every((row) => {
        const digitsFromSource = row.accountNumberRaw.replace(/\D+/gu, "");

        return (
          /^\d+$/u.test(row.accountNumberNormalized) &&
          row.accountNumberNormalized === digitsFromSource &&
          row.accountNumberNormalized.length === digitsFromSource.length
        );
      }),
    ).toBe(true);
  });

  it("converts the sign in one explicit function", () => {
    expect(toOsbbBalance(500)).toBe(-500);
    expect(toOsbbBalance(-375.97)).toBe(375.97);
    expect(toOsbbBalance(0)).toBe(-0);
    expect(toOsbbBalance(null)).toBeNull();
  });

  it("runs through the shared registry and pipeline", () => {
    resetImportAdapterRegistryForTests();
    registerBuiltInImportAdapters();

    const result = runImportPipeline<Debtors1cRow>(
      loadFixtureSheet(),
      "debtors_1c",
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.adapterKey).toBe("debtors_1c");
    expect(result.value.period).toEqual({
      year: 2026,
      month: 5,
      sourceText: "за Травень 2026 р.",
    });
    expect(result.value.stats.dataRows).toBe(132);
    expect(result.value.stats.byClassification).toMatchObject({
      data: 132,
      skip_provider: 8,
      skip_group: 22,
      skip_total: 1,
    });
  });

  it.each([
    ["Січень", 1],
    ["Лютий", 2],
    ["Березень", 3],
    ["Квітень", 4],
    ["Травень", 5],
    ["Червень", 6],
    ["Липень", 7],
    ["Серпень", 8],
    ["Вересень", 9],
    ["Жовтень", 10],
    ["Листопад", 11],
    ["Грудень", 12],
  ])("extracts Ukrainian month %s", (monthName, expectedMonth) => {
    const fixture = loadFixtureSheet();

    const changed: RawSheet = {
      ...fixture,
      rows: fixture.rows.map((row) =>
        row.map((cell) =>
          typeof cell === "string" ? cell.replace("Травень", monthName) : cell,
        ),
      ),
    };

    expect(debtors1cAdapter.extractPeriod(changed)).toEqual({
      year: 2026,
      month: expectedMonth,
      sourceText: `за ${monthName} 2026 р.`,
    });
  });

  it.each([
    ["Январь", 1],
    ["Февраль", 2],
    ["Март", 3],
    ["Апрель", 4],
    ["Май", 5],
    ["Июнь", 6],
    ["Июль", 7],
    ["Август", 8],
    ["Сентябрь", 9],
    ["Октябрь", 10],
    ["Ноябрь", 11],
    ["Декабрь", 12],
  ])("extracts Russian month %s", (monthName, expectedMonth) => {
    const fixture = loadFixtureSheet();

    const changed: RawSheet = {
      ...fixture,
      rows: fixture.rows.map((row) =>
        row.map((cell) =>
          typeof cell === "string"
            ? cell
                .replace(
                  "Коротка зведена відомість",
                  "Краткая сводная ведомость",
                )
                .replace("Травень 2026 р.", `${monthName} 2026 г.`)
            : cell,
        ),
      ),
    };

    expect(debtors1cAdapter.extractPeriod(changed)).toEqual({
      year: 2026,
      month: expectedMonth,
      sourceText: `за ${monthName} 2026 г.`,
    });
  });
});
