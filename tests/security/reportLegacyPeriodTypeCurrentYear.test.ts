import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("report legacy period_type compatibility", () => {
  it("does not classify every year or quarter report as past", () => {
    const shared = read("src/modules/content-engine/v2/handlers/reports/commands/shared.ts");
    const workspace = read("src/modules/houses/components/HouseReportsWorkspace.tsx");

    expect(shared).toContain("function getLegacyPeriodTypeForYear");
    expect(shared).toContain("period_type: getLegacyPeriodTypeForYear(period.year)");

    expect(workspace).toContain("periodYear: number | null");
    expect(workspace).toContain('return periodYear < new Date().getFullYear() ? "past" : "current"');

    expect(shared).not.toContain('period.kind === "year" || period.kind === "quarter") {\n    return {\n      period_type: "past"');
  });

  it("ships a data forward-fix for already-created rows", () => {
    const migration = read("supabase/migrations/202607132045_normalize_report_legacy_period_type.sql");

    expect(migration).toContain("period_kind in ('month', 'quarter', 'year')");
    expect(migration).toContain("period_year >= current_year");
    expect(migration).toContain("period_type = 'current'");
    expect(migration).toContain("period_year < current_year");
    expect(migration).toContain("period_type = 'past'");
  });
});
