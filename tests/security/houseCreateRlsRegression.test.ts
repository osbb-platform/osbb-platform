import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const source = read("src/modules/houses/actions/createHouse.ts");
const p09Rls = read(
  "supabase/migrations/202608241700_p09_r0_1_city_scope_houses_districts.sql",
);

describe("house creation under P09 scoped RLS", () => {
  it("separates INSERT from the post-insert SELECT", () => {
    const insertStart = source.indexOf('.from("houses")\n    .insert({');
    expect(insertStart).toBeGreaterThan(-1);

    const insertErrorCheck = source.indexOf("if (insertError)", insertStart);
    expect(insertErrorCheck).toBeGreaterThan(insertStart);

    const insertStatement = source.slice(insertStart, insertErrorCheck);
    expect(insertStatement).toContain("id: houseId");
    expect(insertStatement).not.toContain(".select(");
    expect(source).toContain("const houseId = randomUUID();");

    expect(source).toMatch(
      /const \{ data: createdHouse, error: createdHouseReadError \} = await supabase[\s\S]*?\.from\("houses"\)[\s\S]*?\.select\("id, name, slug, public_description, district:districts\(theme_color\)"\)[\s\S]*?\.eq\("id", houseId\)[\s\S]*?\.single\(\)/,
    );
  });

  it("keeps the P09 tenant-isolation policies strict", () => {
    expect(p09Rls).toMatch(
      /create policy houses_admin_select_scoped[\s\S]*?using \(public\.admin_has_house_access\(id\)\)/i,
    );
    expect(p09Rls).toMatch(
      /create policy houses_admin_insert_scoped[\s\S]*?district_id is not null[\s\S]*?admin_has_district_access\(district_id\)/i,
    );
    expect(p09Rls).toMatch(
      /create policy houses_admin_delete_archived_scoped[\s\S]*?archived_at is not null[\s\S]*?admin_has_house_access\(id\)/i,
    );
  });

  it("uses an RLS-compatible compensation path for failed bootstrap", () => {
    expect(source).toContain("async function cleanupCreatedHouse(houseId: string)");
    expect(source).toContain("archived_at: new Date().toISOString()");
    expect(source).toContain("is_active: false");
    expect(source).toContain('console.error("createHouse compensation delete error:"');
    expect(source).not.toContain(
      'await supabase.from("houses").delete().eq("id", createdHouse.id);',
    );
  });

  it("keeps raw database details server-side", () => {
    expect(source).toContain('console.error("createHouse insert error:"');
    expect(source).toContain('console.error("createHouse post-insert read error:"');
    expect(source).not.toContain(
      '`Помилка створення будинку: ${insertError.message}`',
    );
    expect(source).not.toContain(
      '`Будинок не створено: не вдалося ініціалізувати доступ. ${accessUpsertError.message}`',
    );
  });
});
