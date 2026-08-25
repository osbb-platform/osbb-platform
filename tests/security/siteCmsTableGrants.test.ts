import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202608251330_fix_public_site_cms_table_grants.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8").toLowerCase();

const tables = [
  "public.site_settings",
  "public.site_cities",
  "public.site_testimonials",
  "public.site_post_categories",
  "public.site_posts",
  "public.site_releases",
] as const;

describe("site CMS table grants repair", () => {
  it("keeps the repair forward-only and non-destructive", () => {
    for (const forbidden of [
      "drop table",
      "drop policy",
      "disable row level security",
      "truncate",
      "delete from",
    ]) {
      expect(migration).not.toContain(forbidden);
    }
  });

  it("covers all six public CMS tables", () => {
    for (const table of tables) {
      expect(migration).toContain(table);
    }
  });

  it("grants anonymous users read-only table access", () => {
    expect(migration).toMatch(
      /grant\s+select[\s\S]*?public\.site_settings[\s\S]*?public\.site_releases[\s\S]*?to\s+anon\s*;/,
    );
    expect(migration).not.toMatch(
      /grant\s+[^;]*(insert|update|delete)[^;]*to\s+anon\s*;/,
    );
  });

  it("grants authenticated users the table privileges needed by existing admin RLS policies", () => {
    expect(migration).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete[\s\S]*?to\s+authenticated\s*;/,
    );
  });

  it("does not replace or weaken RLS policies", () => {
    expect(migration).not.toContain("create policy");
    expect(migration).not.toContain("using (true)");
    expect(migration).not.toContain("with check (true)");
  });
});
