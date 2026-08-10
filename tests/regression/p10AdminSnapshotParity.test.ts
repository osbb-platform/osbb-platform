import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const service = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/houses/services/getAdminHouseDebtors.ts",
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

describe("P10 T7 admin snapshot reconciliation", () => {
  it("exposes the latest published snapshot rows separately from legacy activeItems", () => {
    expect(service).toContain("latestPublishedItems");
    expect(service).toContain("latestPublishedMonth.id");
    expect(service).toContain("house_debtor_month_rows");
    expect(service).toContain("closing_balance");
  });

  it("computes reconciliation from latest published snapshot rows", () => {
    expect(workspace).toContain("publishedSnapshotItems");
    expect(workspace).toContain("publishedReconciliationTotals");
    expect(workspace).toContain("unmatchedDebtTotal: publishedUnmatchedDebtTotal");
    expect(workspace).toContain("publishedReconciliationTotals.saldo");
    expect(workspace).toContain(
      "publishedReconciliationTotals.saldoWithUnmatched",
    );
  });

  it("renders the required manager reconciliation labels and tooltip", () => {
    expect(workspace).toContain("Сальдо по знімку");
    expect(workspace).toContain("Не увійшло (техрахунок)");
    expect(workspace).toContain("Разом (звірка з 1С)");
    expect(workspace).toContain("Сума всіх боргів");
    expect(workspace).toContain("Боржників (≥500 ₴)");
    expect(workspace).toContain(
      'Це число має збігатися з колонкою "Борг" у підсумковому рядку 1С',
    );
  });
});
