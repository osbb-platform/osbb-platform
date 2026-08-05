import { describe, expect, it } from "vitest";

import {
  recoverConfirmedDebtors1cImportState,
  recoverTransferredDebtors1cImportState,
} from "../../src/modules/import-buffer/debtors1cImportRecovery";
import type { Debtors1cImportState } from "../../src/modules/import-buffer/debtors1cImportState";

const state: Extract<Debtors1cImportState, { ok: true }> = {
  ok: true,
  uploadId: "upload-1",
  lockVersion: 1,
  status: "parsed",
  detectedPeriod: {
    year: 2026,
    month: 7,
    sourceText: "Липень 2026",
  },
  confirmedPeriod: null,
  rows: [],
  unknownSourceAccounts: [],
  missingRegistryAccounts: [],
  warningCount: 0,
  message: "Preview ready",
};

describe("P04 import-buffer recovery", () => {
  it("recovers a concurrently confirmed upload without reporting stale data", () => {
    const result = recoverConfirmedDebtors1cImportState(
      state,
      {
        status: "confirmed",
        lock_version: 2,
        confirmed_period_year: 2026,
        confirmed_period_month: 7,
        stats: {},
      },
      {
        year: 2026,
        month: 7,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      status: "confirmed",
      lockVersion: 2,
      confirmedPeriod: {
        year: 2026,
        month: 7,
      },
    });
  });

  it("recovers a completed upload as success after a lost or duplicated response", () => {
    const result = recoverTransferredDebtors1cImportState(state, {
      status: "transferred",
      lock_version: 3,
      confirmed_period_year: 2026,
      confirmed_period_month: 7,
      stats: {
        snapshotId: "snapshot-1",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: "transferred",
      lockVersion: 3,
      snapshotId: "snapshot-1",
    });
  });

  it("does not hide a real period conflict", () => {
    const result = recoverConfirmedDebtors1cImportState(
      state,
      {
        status: "confirmed",
        lock_version: 2,
        confirmed_period_year: 2026,
        confirmed_period_month: 6,
        stats: {},
      },
      {
        year: 2026,
        month: 7,
      },
    );

    expect(result).toBeNull();
  });
});
