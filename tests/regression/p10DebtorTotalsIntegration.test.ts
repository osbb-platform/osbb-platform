import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicPage = fs.readFileSync(
  path.join(
    process.cwd(),
    "app/(public)/house/[slug]/debtors/page.tsx",
  ),
  "utf8",
);

const workspace = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/houses/components/HouseDebtorsWorkspace.tsx",
  ),
  "utf8",
);

describe("P10 T5 unified debtor totals integration", () => {
  it("uses computeDebtorTotals for public headline aggregates", () => {
    expect(publicPage).toContain("computeDebtorTotals");
    expect(publicPage).toContain("totals.debtorsCount");
    expect(publicPage).toContain("totals.totalDebt");
    expect(publicPage).not.toContain("const totalDebtAmount = debtItems.reduce");
  });

  it("uses computeDebtorTotals for admin preview and published count", () => {
    expect(workspace).toContain("const previewTotals = useMemo");
    expect(workspace).toContain("previewTotals.debtorsCount");
    expect(workspace).toContain("previewTotals.totalDebt");
    expect(workspace).toContain("const publishedTotals = computeDebtorTotals");
    expect(workspace).toContain(
      "const publishedDebtorsCount = publishedTotals.debtorsCount",
    );
  });
});
