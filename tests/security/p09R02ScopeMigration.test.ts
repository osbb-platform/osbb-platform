import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608241730_p09_r0_2_apartments_house_access_scope.sql"),
  "utf8",
);

describe("P09 R0.2 migration contract", () => {
  it("scopes house_apartments", () => {
    expect(migration).toMatch(/house_apartments_select_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
    expect(migration).toMatch(/house_apartments_insert_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
    expect(migration).toMatch(/house_apartments_update_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
  });

  it("scopes house_access", () => {
    expect(migration).toMatch(/house_access_select_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
    expect(migration).toMatch(/house_access_update_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
  });

  it("guards upsert_house_access and removes anon execute", () => {
    expect(migration).toMatch(/not public\.admin_has_house_access\(target_house_id\)/i);
    expect(migration).toMatch(/revoke all on function public\.upsert_house_access\(uuid, text\)[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.upsert_house_access\(uuid, text\)[\s\S]*to authenticated, service_role/i);
  });

  it("does not redefine resident verification RPCs", () => {
    expect(migration).not.toMatch(/create or replace function public\.verify_house_access/i);
    expect(migration).not.toMatch(/create or replace function public\.is_house_session_valid/i);
  });
});
