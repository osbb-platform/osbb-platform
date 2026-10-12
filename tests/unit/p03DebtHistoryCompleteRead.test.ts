import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(
    process.cwd(),
    "src/modules/content-engine/v2/handlers/debtors/commands/historyShared.ts",
  ),
  "utf8",
);

describe("P03 publication history reads fail closed", () => {
  it("paginates snapshots and batched history rows with exact counts", () => {
    expect(source).toContain("readAllCountedPages<HouseDebtorMonthSnapshot>");
    expect(source).toContain("readAllCountedPages<HouseDebtorMonthRow>");
    expect(source).toContain('{ count: "exact" }');
    expect(source).toContain('.in("snapshot_id", snapshotIds)');
    expect(source).toContain('.order("snapshot_id", { ascending: true })');
    expect(source).toContain('.order("id", { ascending: true })');
  });

  it("does not issue one rows query per published snapshot", () => {
    expect(source).not.toContain("for (const snapshot of snapshots)");
    expect(source).toContain("SNAPSHOT_IDS_PER_HISTORY_QUERY = 100");
    expect(source).toContain("chunkValues(");
    expect(source).toContain("Failed to load complete published debtor history");
    expect(source).toContain(
      'return err("Не вдалося завантажити історичні рядки.", "INTERNAL")',
    );
  });
});
