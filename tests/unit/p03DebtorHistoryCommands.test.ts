
import {
  describe,
  expect,
  it,
} from "vitest";

import { debtorsHandler } from "../../src/modules/content-engine/v2/handlers/debtors/handler";
import { importMonthDraftCommand } from "../../src/modules/content-engine/v2/handlers/debtors/commands/importMonthDraft";

describe("P03 debtor history commands", () => {
  it("registers all monthly snapshot commands", () => {
    expect(Object.keys(debtorsHandler.commands)).toEqual(
      expect.arrayContaining([
        "importMonthDraft",
        "publishMonthSnapshot",
        "discardMonthSnapshot",
        "relabelMonthSnapshot",
      ]),
    );
  });

  it("rejects duplicate accounts before calling the database", async () => {
    const result = await importMonthDraftCommand.validate?.(
      {
        periodYear: 2026,
        periodMonth: 6,
        rows: [
          { accountNumber: "100", closingBalance: -700 },
          { accountNumber: "100", closingBalance: -800 },
        ],
      },
      {} as never,
    );

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_FAILED",
      error: "Особовий рахунок 100 повторюється у файлі.",
    });
  });

  it("accepts a normalized valid monthly import payload", async () => {
    const result = await importMonthDraftCommand.validate?.(
      {
        periodYear: 2026,
        periodMonth: 6,
        source: "manual_import",
        importMeta: { fileName: "debtors.xlsx" },
        rows: [
          {
            accountNumber: "100",
            accrued: 300,
            paid: 100,
            closingBalance: -700,
            debtSourceValue: 700,
          },
        ],
      },
      {} as never,
    );

    expect(result).toEqual({ ok: true, data: undefined });
  });
});
