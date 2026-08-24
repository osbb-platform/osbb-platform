import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backfill = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608241930_p09_t2_backfill_zaporizhzhia.sql",
  ),
  "utf8",
).toLowerCase();

const notNull = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608241940_p09_t2_district_city_not_null.sql",
  ),
  "utf8",
).toLowerCase();

describe("P09 T2 Zaporizhzhia migration", () => {
  it("creates only Zaporizhzhia as the migrated city", () => {
    expect(backfill).toContain("'запоріжжя'");
    expect(backfill).toContain("'zaporizhzhia'");
    expect(backfill).not.toContain("'київ'");
    expect(backfill).not.toContain("'kyiv'");
  });

  it("backfills all districts through the canonical city row", () => {
    expect(backfill).toMatch(
      /update public\.districts[\s\S]*set city_id = zp\.id[\s\S]*where district\.city_id is null/,
    );
  });

  it("backfills only city-scoped role semantics without requiring the future enum value", () => {
    expect(backfill).toContain("membership.role::text in");
    expect(backfill).toContain("'admin'");
    expect(backfill).toContain("'manager'");
    expect(backfill).toContain("'content_manager'");
    expect(backfill).not.toMatch(/'content_manager'::public\.admin_role/);
  });

  it("protects global superadmin semantics", () => {
    expect(backfill).toContain("'superadmin'");
    expect(backfill).toContain("'super_admin'");
    expect(backfill).toMatch(
      /where role::text in \('superadmin','super_admin'\)[\s\S]*city_id is not null/,
    );
  });

  it("keeps NOT NULL out of the data backfill migration", () => {
    expect(backfill).not.toMatch(/alter column city_id set not null/);
  });

  it("sets districts.city_id NOT NULL only in the separate guarded migration", () => {
    expect(notNull).toMatch(
      /select count\(\*\)[\s\S]*from public\.districts[\s\S]*where city_id is null/,
    );
    expect(notNull).toMatch(
      /alter table public\.districts[\s\S]*alter column city_id set not null/,
    );
  });
});
