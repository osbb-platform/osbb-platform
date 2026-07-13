import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "202607131730_fix_annual_reports_period_kind.sql",
  ),
  "utf8",
);

describe("annual report period recovery migration", () => {
  it("is guarded by the expected production candidate count", () => {
    expect(migration).toContain("expected_count integer := 89");
    expect(migration).toContain("Unexpected annual-report recovery candidate count");
    expect(migration).toContain("missing_title_year_count");
  });

  it("recovers the year from title rather than legacy period metadata", () => {
    expect(migration).toContain("substring(report.title from '(20[0-9]{2}|19[0-9]{2})')::integer as title_year");
    expect(migration).toContain("period_year = candidates.title_year");
    expect(migration).toContain("year = candidates.title_year");
  });

  it("moves recovered reports from month to year period kind", () => {
    expect(migration).toContain("period_kind = 'year'");
    expect(migration).toContain("period_month = null");
    expect(migration).toContain("period_type = 'past'");
    expect(migration).toContain("month = null");
  });

  it("keeps an audit table for recovered rows", () => {
    expect(migration).toContain("public._p01_annual_report_recovery_audit");
    expect(migration).toContain("recovered_period_year integer not null");
    expect(migration).toContain("on conflict (report_id) do nothing");
  });
});
