import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  debtors1cAdapter,
} from "../../src/modules/import-buffer/adapters/debtors1c";
import type { Debtors1cRow } from "../../src/modules/import-buffer/adapters/debtors1c";
import type { RawSheet } from "../../src/modules/import-buffer/types";

function loadFixtureSheet(): RawSheet {
  const fixture = join(
    process.cwd(),
    "tests/fixtures/1c/Соборний,186.xls",
  );

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

function parse(sheet: RawSheet) {
  const header = debtors1cAdapter.locateHeader(sheet);

  expect(header.ok).toBe(true);

  if (!header.ok) {
    throw new Error("fixture header not found");
  }

  return debtors1cAdapter.parseRows(sheet, header.value);
}

describe("P10 T2 technical account classification", () => {
  it("classifies the confirmed Sobornyi fixture technical row as skip_service", () => {
    const rows = parse(loadFixtureSheet());

    expect(
      rows.filter((row) => row.classification === "data"),
    ).toHaveLength(131);

    expect(
      rows.filter((row) => row.classification === "skip_service"),
    ).toHaveLength(1);

    const dataValues = rows
      .filter((row) => row.classification === "data")
      .map((row) => row.value as Debtors1cRow);

    expect(
      dataValues.some(
        (row) => row.accountNumberNormalized === "609740999",
      ),
    ).toBe(false);

    expect(
      dataValues.some(
        (row) => row.accountNumberNormalized === "609740004",
      ),
    ).toBe(true);
  });

  it("does not depend on account-number suffix 999", () => {
    const fixture = loadFixtureSheet();
    const header = debtors1cAdapter.locateHeader(fixture);

    expect(header.ok).toBe(true);

    if (!header.ok) {
      return;
    }

    const syntheticRows = fixture.rows.map((row) => [...row]);

    const sourceIndex = syntheticRows.findIndex(
      (row) => String(row[2] ?? "").trim() === "Кв. 999",
    );

    expect(sourceIndex).toBeGreaterThanOrEqual(0);

    const synthetic = [...syntheticRows[sourceIndex]];
    synthetic[1] = "л/с №609352199";
    synthetic[2] = "Кв. 999";
    synthetic[3] = "незясовані 999";
    synthetic[4] = 0;

    syntheticRows[sourceIndex] = synthetic;

    const parsed = debtors1cAdapter.parseRows(
      {
        ...fixture,
        rows: syntheticRows,
      },
      header.value,
    );

    expect(
      parsed.filter((row) => row.classification === "skip_service"),
    ).toHaveLength(1);

    expect(
      parsed
        .filter((row) => row.classification === "data")
        .map((row) => row.value as Debtors1cRow)
        .some((row) => row.accountNumberNormalized === "609352199"),
    ).toBe(false);
  });

  it("does not skip an ordinary unmatched-looking residential row", () => {
    const fixture = loadFixtureSheet();
    const header = debtors1cAdapter.locateHeader(fixture);

    expect(header.ok).toBe(true);

    if (!header.ok) {
      return;
    }

    const rows = fixture.rows.map((row) => [...row]);

    const sourceIndex = rows.findIndex(
      (row) => String(row[1] ?? "").includes("609740004"),
    );

    expect(sourceIndex).toBeGreaterThanOrEqual(0);

    const ordinary = [...rows[sourceIndex]];
    ordinary[1] = "л/с №123456999";
    ordinary[2] = "Кв. 4";
    ordinary[3] = "Павлова Діна Федотівна";
    ordinary[4] = 52.47;

    rows[sourceIndex] = ordinary;

    const parsed = debtors1cAdapter.parseRows(
      {
        ...fixture,
        rows,
      },
      header.value,
    );

    const value = parsed
      .filter((row) => row.classification === "data")
      .map((row) => row.value as Debtors1cRow)
      .find((row) => row.accountNumberNormalized === "123456999");

    expect(value).toBeDefined();
    expect(value?.apartmentLabel).toBe("Кв. 4");
    expect(value?.area).toBe(52.47);
  });
});
