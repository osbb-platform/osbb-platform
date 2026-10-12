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
const parserSource = readFileSync(
  join(
    process.cwd(),
    "src/modules/houses/utils/debtorsSpreadsheet.ts",
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
    // Track 4: the unit noun is object_kind-aware (Квартир/Ділянок).
    expect(source).toContain("без рядка: {monthlyMissingApartmentsCount}");
  });

  it("bounds cleaned spreadsheet parsing and disables formula retention", () => {
    expect(parserSource).toContain("MAX_IMPORT_FILE_BYTES");
    expect(parserSource).toContain("MAX_IMPORT_ROWS");
    expect(parserSource).toContain("MAX_IMPORT_CELLS");
    expect(parserSource).toContain("cellFormula: false");
  });

  it("distinguishes physical snapshot rows from public threshold debtors", () => {
    expect(source).toContain("Фізично збережених балансів:");
    expect(source).toContain("Публічних боржників (борг ≥500 ₴)");
  });
});
