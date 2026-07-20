import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/modules/houses/services/getPublishedHouseDebtors.ts"),
  "utf8",
);

describe("P03 public debtor history service", () => {
  it("uses the calculated history projection instead of legacy items", () => {
    expect(source).toContain('.rpc("get_public_house_debtor_history"');
    expect(source).not.toContain('.from("house_debtors_items")');
  });

  it("maps latest period and continuous debt metadata", () => {
    expect(source).toContain("latestPublishedMonth");
    expect(source).toContain("monthsInDebt");
    expect(source).toContain("seriesBroken");
  });
});
