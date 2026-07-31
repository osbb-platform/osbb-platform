import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/modules/houses/components/HouseDebtorsWorkspace.tsx"),
  "utf8",
);

describe("P03 monthly debtor import UX", () => {
  it("uses previous month defaults and explicit confirmation", () => {
    expect(source).toContain("getPreviousCalendarPeriod");
    expect(source).toContain("periodConfirmed");
    expect(source).toContain("Підтвердіть місяць");
  });

  it("dispatches importMonthDraft with period and all valid balances", () => {
    expect(source).toContain('type: "debtors.importMonthDraft"');
    expect(source).toContain("periodYear");
    expect(source).toContain("periodMonth");
    expect(source).toContain('source: "manual_import"');
    expect(source).toContain("monthlyImportRows");
    expect(source).toContain("closingBalance: parseBalanceAmount(item.amount)");
  });

  it("shows missing-apartment warnings in preview", () => {
    expect(source).toContain("monthlyMissingApartmentsCount");
    expect(source).toContain("Квартир без рядка");
  });
});
