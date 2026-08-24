import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608241700_p09_r0_1_city_scope_houses_districts.sql",
  ),
  "utf8",
);

describe("P09 R0.1 city-scope migration contract", () => {
  it("creates only the additive city substrate required by R0", () => {
    expect(migration).toMatch(/create table if not exists public\.cities/i);
    expect(migration).toMatch(
      /alter table public\.districts[\s\S]*add column if not exists city_id uuid null/i,
    );
    expect(migration).toMatch(
      /alter table public\.admin_memberships[\s\S]*add column if not exists city_id uuid null/i,
    );

    expect(migration).not.toMatch(
      /alter table public\.districts[\s\S]*city_id set not null/i,
    );
    expect(migration).not.toMatch(/insert into public\.cities/i);
  });

  it("defines hardened city, district and house scope helpers", () => {
    for (const functionName of [
      "admin_is_superadmin",
      "admin_current_membership_city",
      "admin_city_scope",
      "admin_has_district_access",
      "admin_has_house_access",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `create or replace function public\\.${functionName}\\(`,
          "i",
        ),
      );
    }

    expect(migration).toMatch(/security definer/gi);
    expect(migration).toMatch(/set search_path = ''/gi);
  });

  it("removes permissive authenticated policies before adding scoped policies", () => {
    expect(migration).toMatch(
      /drop policy if exists districts_select_authenticated/i,
    );
    expect(migration).toMatch(
      /drop policy if exists districts_update_authenticated/i,
    );
    expect(migration).toMatch(
      /drop policy if exists "Authenticated admins can read all houses"/i,
    );

    expect(migration).toMatch(
      /create policy houses_admin_select_scoped[\s\S]*admin_has_house_access\(id\)/i,
    );
    expect(migration).toMatch(
      /create policy districts_admin_select_scoped[\s\S]*admin_has_district_access\(id\)/i,
    );
  });

  it("separates anonymous public reads from authenticated admin reads", () => {
    expect(migration).toMatch(
      /create policy houses_public_read_active[\s\S]*to anon[\s\S]*is_active = true/i,
    );
    expect(migration).toMatch(
      /create policy districts_public_read[\s\S]*to anon[\s\S]*using \(true\)/i,
    );

    expect(migration).not.toMatch(
      /create policy houses_public_read_active[\s\S]*to public/i,
    );
    expect(migration).not.toMatch(
      /create policy districts_public_read[\s\S]*to public/i,
    );
  });
});
