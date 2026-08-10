import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync(
  path.join(
    process.cwd(),
    "app/(public)/house/[slug]/debtors/page.tsx",
  ),
  "utf8",
);

describe("P10 T6 public debtors semantics", () => {
  it("shows total debt from all negative balances and threshold debtor count", () => {
    expect(page).toContain("totals.totalDebt");
    expect(page).toContain("totals.debtorsCount");
    expect(page).toContain(
      "Сума заборгованості всіх квартир будинку",
    );
  });

  it("hides unreliable months-in-debt values", () => {
    expect(page).toContain("item.monthsInDebt >= 2");
    expect(page).toContain("!item.seriesBroken");
  });

  it("shows the real history start and does not expose saldo", () => {
    expect(page).toContain("Історія ведеться з");
    expect(page).toContain("червня 2026");
    expect(page).not.toContain("totals.saldo}");
    expect(page).not.toContain("totals.saldoWithUnmatched");
  });
});
