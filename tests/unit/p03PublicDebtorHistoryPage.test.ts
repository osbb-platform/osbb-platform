import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "app/(public)/house/[slug]/debtors/page.tsx"),
  "utf8",
);

describe("P03 public debtor history page", () => {
  it("shows the latest published period", () => {
    expect(source).toContain("latestPublishedMonth");
    expect(source).toContain("Актуальний період");
    expect(source).toContain("formatPeriodLabel");
  });

  it("shows continuous months in debt and keeps the -500 rule", () => {
    expect(source).toContain("monthsInDebt");
    expect(source).toContain("Місяців у боргу");
    expect(source).toContain("isAmountEligibleForDebtors");
  });
});
