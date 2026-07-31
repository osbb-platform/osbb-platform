import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function loadMigration() {
  const dir = join(process.cwd(), "supabase", "migrations");
  const matches = readdirSync(dir).filter((name) =>
    /^\d{12}_add_public_debtor_history_read_model\.sql$/u.test(name),
  );
  expect(matches).toHaveLength(1);
  return readFileSync(join(dir, matches[0]), "utf8");
}

describe("P03 public debtor history read model migration", () => {
  it("creates a published-only latest-period function", () => {
    const sql = loadMigration().toLowerCase().replace(/\s+/gu, " ");
    expect(sql).toContain("create or replace function public.get_public_house_debtor_history");
    expect(sql).toContain("snapshot.status = 'published'");
    expect(sql).toContain("order by snapshot.period_year desc");
    expect(sql).toContain("snapshot.period_month desc");
    expect(sql).toContain("limit 1");
  });

  it("returns calculated monthly series without exposing drafts", () => {
    const sql = loadMigration().toLowerCase().replace(/\s+/gu, " ");
    expect(sql).toContain("house_debtor_month_rows");
    expect(sql).toContain("house_debtor_series");
    expect(sql).toContain("months_in_debt");
    expect(sql).toContain("series_broken");
    expect(sql).not.toContain("status = 'draft'");
  });

  it("hardens security definer and grants execute only", () => {
    const sql = loadMigration().toLowerCase().replace(/\s+/gu, " ");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("revoke all on function");
    expect(sql).toContain("grant execute on function");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).not.toContain("using (true)");
  });
});
