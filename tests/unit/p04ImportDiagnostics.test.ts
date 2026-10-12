import { describe, expect, it } from "vitest";

import { computeDebtorTotals } from "../../src/modules/houses/debtors-history/computeDebtorTotals";
import {
  buildDebtors1cImportCounters,
  resolveStoredConfirmedPeriod,
} from "../../src/modules/import-buffer/debtors1cImportDiagnostics";
import { hasDebtors1cRegistryMappingChanged } from "../../src/modules/import-buffer/matching";

describe("P04 import diagnostics and canonical period", () => {
  it("distinguishes 325 data rows, transferable balances and 25 public debtors", () => {
    const rows = Array.from({ length: 325 }, (_, index) => ({
      classification: "data" as const,
      match_status: "matched" as const,
      matched_apartment_id: `apartment-${index + 1}`,
      account_number_normalized: `account-${index + 1}`,
      debt_value: index < 25 ? 500 + index : 100,
    }));

    const counters = buildDebtors1cImportCounters({
      sourceRows: 340,
      registryRows: 325,
      rows,
    });
    const totals = computeDebtorTotals({
      rows: rows.map((row) => ({
        accountNumber: row.account_number_normalized,
        closingBalance: -Number(row.debt_value),
      })),
    });

    expect(counters).toMatchObject({
      sourceRows: 340,
      registryRows: 325,
      classifiedRows: 325,
      unclassifiedRows: 15,
      technicalExcludedRows: 0,
      dataRows: 325,
      matchedRows: 325,
      unmatchedRows: 0,
      missingDebtRows: 0,
      transferableRows: 325,
    });
    expect(totals.debtorsCount).toBe(25);
  });

  it("makes partial and null-debt exclusions explicit", () => {
    const counters = buildDebtors1cImportCounters({
      sourceRows: 7,
      registryRows: 4,
      rows: [
        {
          classification: "skip_service",
          match_status: "skipped",
          matched_apartment_id: null,
          account_number_normalized: null,
          debt_value: null,
        },
        ...Array.from({ length: 3 }, (_, index) => ({
          classification: "data" as const,
          match_status: "matched" as const,
          matched_apartment_id: `apartment-${index + 1}`,
          account_number_normalized: `account-${index + 1}`,
          debt_value: index === 2 ? null : 100,
        })),
        {
          classification: "data" as const,
          match_status: "unmatched" as const,
          matched_apartment_id: null,
          account_number_normalized: "unknown",
          debt_value: 200,
        },
      ],
    });

    expect(counters).toMatchObject({
      classifiedRows: 5,
      unclassifiedRows: 2,
      technicalExcludedRows: 1,
      dataRows: 4,
      matchedRows: 3,
      unmatchedRows: 1,
      missingDebtRows: 1,
      transferableRows: 2,
    });
  });

  it("uses the confirmed DB period and rejects missing pairs", () => {
    expect(
      resolveStoredConfirmedPeriod({
        confirmed_period_year: 2026,
        confirmed_period_month: 9,
      }),
    ).toEqual({ year: 2026, month: 9 });

    expect(
      resolveStoredConfirmedPeriod({
        confirmed_period_year: 2026,
        confirmed_period_month: null,
      }),
    ).toBeNull();
  });

  it("detects count-preserving registry drift before transfer", () => {
    const stagedRows = [
      {
        account_number_normalized: "1001",
        match_status: "matched" as const,
        matched_apartment_id: "apartment-a",
      },
      {
        account_number_normalized: "1002",
        match_status: "unmatched" as const,
        matched_apartment_id: null,
      },
    ];

    expect(
      hasDebtors1cRegistryMappingChanged({
        stagedRows,
        registryRows: [
          { id: "apartment-a", account_number: "1001" },
          { id: "apartment-b", account_number: "9999" },
        ],
      }),
    ).toBe(false);

    expect(
      hasDebtors1cRegistryMappingChanged({
        stagedRows,
        registryRows: [
          { id: "apartment-b", account_number: "1001" },
          { id: "apartment-a", account_number: "9999" },
        ],
      }),
    ).toBe(true);

    expect(
      hasDebtors1cRegistryMappingChanged({
        stagedRows,
        registryRows: [
          { id: "apartment-a", account_number: "1001" },
          { id: "apartment-b", account_number: "1002" },
        ],
      }),
    ).toBe(true);
  });
});
