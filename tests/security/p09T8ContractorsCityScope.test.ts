import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T8 contractors city scope", () => {
  it("adds city FK without backfilling global contractors", () => {
    const sql = read(
      "supabase/migrations/202608251230_p09_t8_contractors_city_scope.sql",
    );

    expect(sql).toContain("contractors_city_id_fkey");
    expect(sql).toContain("references public.cities(id)");
    expect(sql).not.toMatch(/update\s+public\.contractors[\s\S]*set\s+city_id/i);
  });

  it("keeps separate global and per-city uniqueness semantics", () => {
    const base = read(
      "supabase/migrations/202607231410_create_contractors_directory.sql",
    );
    const sql = read(
      "supabase/migrations/202608251230_p09_t8_contractors_city_scope.sql",
    );

    expect(base).toContain("contractors_global_normalized_name_uq");
    expect(base).toContain("where city_id is null");
    expect(sql).toContain("contractors_city_normalized_name_uq");
    expect(sql).toContain("on public.contractors (city_id, normalized_name)");
    expect(sql).toContain("where city_id is not null");
  });

  it("replaces using(true) with global-or-city scoped SELECT", () => {
    const sql = read(
      "supabase/migrations/202608251230_p09_t8_contractors_city_scope.sql",
    );

    expect(sql).toContain("contractors_authenticated_select_scoped");
    expect(sql).toContain("city_id is null");
    expect(sql).toContain("public.admin_city_scope(city_id)");
    expect(sql).not.toContain("using (true)");
  });

  it("requires new contractors to be non-global and in author scope", () => {
    const sql = read(
      "supabase/migrations/202608251230_p09_t8_contractors_city_scope.sql",
    );
    const action = read(
      "src/modules/houses/actions/createAdminContractor.ts",
    );

    expect(sql).toContain("city_id is not null");
    expect(sql).toContain("created_by = auth.uid()");
    expect(action).toContain("city_id: cityContext.cityId");
    expect(action).toContain("created_by: currentUser.id");
  });

  it("allows global deactivation only for superadmin and city deactivation for city-admin", () => {
    const action = read(
      "src/modules/houses/actions/deactivateAdminContractor.ts",
    );

    expect(action).toContain("contractor.city_id === null");
    expect(action).toContain("currentUser.role !== ROLES.SUPERADMIN");
    expect(action).toContain("currentUser.role !== ROLES.ADMIN");
    expect(action).toContain("contractor.city_id !== cityContext.cityId");
  });

  it("loads only global plus active city contractors", () => {
    const service = read(
      "src/modules/houses/services/getAdminContractors.ts",
    );

    expect(service).toContain(
      ".or(`city_id.is.null,city_id.eq.${cityContext.cityId}`)",
    );
  });

  it("removes direct browser contractor writes", () => {
    const ui = read(
      "src/modules/houses/components/ContractorCombobox.tsx",
    );

    expect(ui).not.toContain("createSupabaseBrowserClient");
    expect(ui).toContain("createAdminContractor");
    expect(ui).toContain("deactivateAdminContractor");
  });
});
