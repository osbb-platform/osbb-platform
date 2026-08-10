import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panel = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/modules/import-buffer/components/HouseDebtors1cImportPanel.tsx",
  ),
  "utf8",
);

describe("P10 T5 import panel unified totals", () => {
  it("uses computeDebtorTotals instead of a local balance reducer", () => {
    expect(panel).toContain("computeDebtorTotals");
    expect(panel).toContain("const amountTotals = useMemo");
    expect(panel).toContain("amountTotals.saldo");
    expect(panel).not.toContain(
      "systemBalance: totals.systemBalance + (row.osbbBalance ?? 0)",
    );
  });
});
