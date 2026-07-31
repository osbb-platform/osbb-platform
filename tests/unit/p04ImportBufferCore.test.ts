import {
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  detectAdapter,
  listRegisteredAdapters,
  normalizeAccountNumber,
  normalizeLocalizedNumber,
  registerAdapter,
  runImportPipeline,
} from "../../src/modules/import-buffer";
import {
  resetImportAdapterRegistryForTests,
} from "../../src/modules/import-buffer/registry";
import type {
  ImportAdapter,
  RawSheet,
} from "../../src/modules/import-buffer";

interface ExampleRow {
  account: string;
}

const sheet: RawSheet = {
  name: "Fixture",
  rows: [
    ["Report"],
    ["Account", "Debt"],
    ["л/с №609740004", "1 234,56"],
    ["Total", "1 234,56"],
  ],
};

function createAdapter(
  confidence = 100,
): ImportAdapter<ExampleRow> {
  return {
    key: "debtors_1c",
    title: "Debtors 1C",
    detect: () => ({
      matched: true,
      confidence,
    }),
    extractPeriod: () => ({
      year: 2026,
      month: 5,
      sourceText: "Травень 2026",
    }),
    locateHeader: () => ({
      ok: true,
      value: {
        rowIndex: 1,
        columns: {
          account: 0,
          debt: 1,
        },
      },
    }),
    parseRows: () => [
      {
        rowIndex: 2,
        classification: "data",
        value: {
          account: "609740004",
        },
        warnings: ["owner_name_mismatch"],
      },
      {
        rowIndex: 3,
        classification: "skip_total",
        value: null,
        warnings: [],
      },
    ],
  };
}

describe("P04 import-buffer core", () => {
  beforeEach(() => {
    resetImportAdapterRegistryForTests();
  });

  it("normalizes localized numbers without inventing values", () => {
    expect(normalizeLocalizedNumber(1234.56)).toBe(1234.56);
    expect(normalizeLocalizedNumber("1 234,56")).toBe(1234.56);
    expect(normalizeLocalizedNumber("1\u00a0234,56")).toBe(1234.56);
    expect(normalizeLocalizedNumber("-1 234,56")).toBe(-1234.56);
    expect(normalizeLocalizedNumber("")).toBeNull();
    expect(normalizeLocalizedNumber("not-a-number")).toBeNull();
  });

  it("normalizes account numbers only from proven configurable tokens", () => {
    expect(
      normalizeAccountNumber("л/с №609740004", {
        prefixes: ["л/с"],
        removableSymbols: ["№"],
      }),
    ).toBe("609740004");

    expect(
      normalizeAccountNumber("60974148"),
    ).toBe("60974148");

    expect(
      normalizeAccountNumber("account-123"),
    ).toBeNull();
  });

  it("registers adapters once and exposes registered keys", () => {
    registerAdapter(createAdapter());

    expect(listRegisteredAdapters()).toEqual([
      "debtors_1c",
    ]);
    expect(detectAdapter(sheet)?.key).toBe("debtors_1c");

    expect(() => registerAdapter(createAdapter())).toThrow(
      "Import adapter is already registered",
    );
  });

  it("runs the shared pipeline and builds preview stats", () => {
    registerAdapter(createAdapter());

    const result = runImportPipeline<ExampleRow>(
      sheet,
      "debtors_1c",
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.period).toEqual({
      year: 2026,
      month: 5,
      sourceText: "Травень 2026",
    });
    expect(result.value.stats).toEqual({
      totalRows: 2,
      dataRows: 1,
      skippedRows: 1,
      warnings: 1,
      byClassification: {
        data: 1,
        skip_service: 0,
        skip_provider: 0,
        skip_group: 0,
        skip_total: 1,
      },
    });
  });

  it("returns safe errors for missing or rejected adapters", () => {
    const missing = runImportPipeline(
      sheet,
      "debtors_1c",
    );

    expect(missing).toEqual({
      ok: false,
      error: {
        code: "ADAPTER_NOT_FOUND",
        message:
          "Import adapter is not registered: debtors_1c",
      },
    });

    registerAdapter({
      ...createAdapter(),
      detect: () => ({
        matched: false,
        confidence: 0,
        reason: "Unsupported fixture",
      }),
    });

    const rejected = runImportPipeline(
      sheet,
      "debtors_1c",
    );

    expect(rejected).toEqual({
      ok: false,
      error: {
        code: "ADAPTER_NOT_DETECTED",
        message: "Unsupported fixture",
      },
    });
  });
});
