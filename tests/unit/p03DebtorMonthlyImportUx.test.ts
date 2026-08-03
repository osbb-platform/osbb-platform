import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
  ),
  "utf8",
);

describe("P03 monthly debtor import UX", () => {
  it("selects the history period inside preview", () => {
    expect(source).toContain("getPreviousCalendarPeriod");
    expect(source).toContain("Місяць для історії");
    expect(source).toContain(
      "Перевірте місяць і рік перед створенням чернетки",
    );

    expect(source).not.toContain("periodConfirmed");
    expect(source).not.toContain("Підтвердіть місяць");
    expect(source).not.toContain('type="checkbox"');
  });

  it("dispatches importMonthDraft with the preview period", () => {
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
