import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202607060004_add_admin_scope_functions.sql",
);

const migration = readFileSync(migrationPath, "utf8");

function extractFunction(name: string): string {
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\([\\s\\S]*?\\$function\\$;`,
    "i",
  );

  const match = migration.match(pattern);

  expect(match, `Expected migration to define public.${name}`).not.toBeNull();

  return match?.[0] ?? "";
}

describe("S1.T4 admin tenant scope groundwork", () => {
  it("defines a restricted single-city compatibility scope", () => {
    const sql = extractFunction("admin_city_scope");

    expect(sql).toMatch(/returns\s+boolean/i);
    expect(sql).toMatch(/language\s+sql/i);
    expect(sql).toMatch(/stable/i);
    expect(sql).toMatch(/security\s+definer/i);
    expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);

    expect(sql).toMatch(/membership\.user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/membership\.house_id\s+is\s+null/i);
    expect(sql).toMatch(/membership\.is_active\s*=\s*true/i);
    expect(sql).toMatch(/membership\.status\s*=\s*'active'/i);

    expect(sql).toMatch(
      /membership\.role\s+in\s*\(\s*'superadmin'::public\.admin_role,\s*'admin'::public\.admin_role\s*\)/i,
    );

    expect(sql).not.toMatch(/'manager'::public\.admin_role/i);
  });

  it("allows a house only through city scope or an exact active assignment", () => {
    const sql = extractFunction("admin_has_house_access");

    expect(sql).toMatch(/target_house_id\s+is\s+not\s+null/i);
    expect(sql).toMatch(
      /from\s+public\.houses\s+as\s+house[\s\S]*house\.id\s*=\s*target_house_id/i,
    );

    expect(sql).toMatch(/public\.admin_city_scope\(\)/i);

    expect(sql).toMatch(
      /membership\.user_id\s*=\s*auth\.uid\(\)/i,
    );
    expect(sql).toMatch(
      /membership\.house_id\s*=\s*target_house_id/i,
    );
    expect(sql).toMatch(/membership\.is_active\s*=\s*true/i);
    expect(sql).toMatch(/membership\.status\s*=\s*'active'/i);

    expect(sql).toMatch(/'superadmin'::public\.admin_role/i);
    expect(sql).toMatch(/'admin'::public\.admin_role/i);
    expect(sql).toMatch(/'manager'::public\.admin_role/i);
  });

  it("uses hardened SECURITY DEFINER contracts", () => {
    const cityScope = extractFunction("admin_city_scope");
    const houseAccess = extractFunction("admin_has_house_access");

    for (const sql of [cityScope, houseAccess]) {
      expect(sql).toMatch(/stable/i);
      expect(sql).toMatch(/security\s+definer/i);
      expect(sql).toMatch(/set\s+search_path\s*=\s*''/i);
    }

    expect(migration).toMatch(
      /revoke\s+all[\s\S]*public\.admin_city_scope\(\)[\s\S]*from\s+public,\s*anon,\s*authenticated/i,
    );
    expect(migration).toMatch(
      /revoke\s+all[\s\S]*public\.admin_has_house_access\(uuid\)[\s\S]*from\s+public,\s*anon,\s*authenticated/i,
    );

    expect(migration).toMatch(
      /grant\s+execute[\s\S]*public\.admin_city_scope\(\)[\s\S]*to\s+authenticated/i,
    );
    expect(migration).toMatch(
      /grant\s+execute[\s\S]*public\.admin_has_house_access\(uuid\)[\s\S]*to\s+authenticated/i,
    );
  });

  it("does not alter existing RLS policies in S1.T4", () => {
    expect(migration).not.toMatch(
      /\b(create|alter|drop)\s+policy\b/i,
    );

    expect(migration).not.toMatch(
      /create\s+or\s+replace\s+function\s+public\.is_authenticated_admin/i,
    );
  });

  it.skip(
    "TODO(S5): manager assigned to house A cannot read or mutate house B through RLS",
    () => {
      throw new Error(
        "Enable after S5 replaces global is_authenticated_admin() policies with admin_has_house_access(house_id).",
      );
    },
  );
});
