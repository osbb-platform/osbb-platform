import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202608241900_p09_t1_finalize_cities_schema.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const normalized = sql.toLowerCase();

describe("P09 T1 cities migration", () => {
  it("finalizes the canonical cities schema without seeding product data", () => {
    expect(normalized).toMatch(/create table if not exists public\.cities/);
    expect(normalized).toContain("name text not null unique");
    expect(normalized).toContain("slug text not null unique");
    expect(normalized).toContain("is_active boolean not null default true");
    expect(normalized).not.toMatch(/insert\s+into\s+public\.cities/);
  });

  it("keeps both city scope columns nullable in T1", () => {
    expect(normalized).toMatch(
      /alter table public\.districts[\s\S]*add column if not exists city_id uuid null/,
    );
    expect(normalized).toMatch(
      /alter table public\.admin_memberships[\s\S]*add column if not exists city_id uuid null/,
    );
    expect(normalized).not.toMatch(
      /alter table public\.districts[\s\S]*city_id\s+set\s+not\s+null/,
    );
  });

  it("keeps city ownership canonical through district and membership foreign keys", () => {
    expect(normalized).toMatch(
      /districts_city_id_fkey[\s\S]*foreign key \(city_id\)[\s\S]*references public\.cities\(id\)[\s\S]*on delete restrict/,
    );
    expect(normalized).toMatch(
      /admin_memberships_city_id_fkey[\s\S]*foreign key \(city_id\)[\s\S]*references public\.cities\(id\)[\s\S]*on delete restrict/,
    );
    expect(normalized).toContain("districts_city_id_idx");
    expect(normalized).toContain("admin_memberships_city_id_idx");
  });

  it("gives authenticated city reads only through admin_city_scope", () => {
    expect(normalized).toMatch(
      /create policy cities_select_authenticated[\s\S]*to authenticated[\s\S]*using \(public\.admin_city_scope\(id\)\)/,
    );
  });

  it("restricts city mutations to superadmin", () => {
    expect(normalized).toMatch(
      /create policy cities_insert_superadmin[\s\S]*with check \(public\.admin_is_superadmin\(\)\)/,
    );
    expect(normalized).toMatch(
      /create policy cities_update_superadmin[\s\S]*using \(public\.admin_is_superadmin\(\)\)[\s\S]*with check \(public\.admin_is_superadmin\(\)\)/,
    );
    expect(normalized).toMatch(
      /create policy cities_delete_superadmin[\s\S]*using \(public\.admin_is_superadmin\(\)\)/,
    );
  });

  it("does not add a city_id directly to houses", () => {
    expect(normalized).not.toMatch(
      /alter table public\.houses[\s\S]*add column[\s\S]*city_id/,
    );
  });
});
