import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T6a city-scoped district mutations", () => {
  it("replaces global district uniqueness with city-scoped uniqueness", () => {
    const sql = read(
      "supabase/migrations/202608251200_p09_t6a_city_scoped_district_uniqueness.sql",
    );

    expect(sql).toContain("drop constraint districts_name_key");
    expect(sql).toContain("drop constraint districts_slug_key");
    expect(sql).toContain("on public.districts(city_id, name)");
    expect(sql).toContain("on public.districts(city_id, slug)");
    expect(sql).not.toMatch(/insert\s+into\s+public\.cities/i);
  });

  it("pins non-superadmin district mutations to membership city", () => {
    const helper = read(
      "src/modules/districts/services/resolveDistrictMutationCity.ts",
    );

    expect(helper).toContain("params.currentAdmin.role !== ROLES.SUPERADMIN");
    expect(helper).toContain(
      "requestedCityId && requestedCityId !== cityContext.cityId",
    );
    expect(helper).toContain("cityId: cityContext.cityId");
  });

  it("allows superadmin only active target cities", () => {
    const helper = read(
      "src/modules/districts/services/resolveDistrictMutationCity.ts",
    );

    expect(helper).toContain('.from("cities")');
    expect(helper).toContain('.eq("id", cityId)');
    expect(helper).toContain('.eq("is_active", true)');
  });

  it("creates and updates districts with city_id", () => {
    for (const path of [
      "src/modules/districts/actions/createDistrict.ts",
      "src/modules/districts/actions/updateDistrict.ts",
    ]) {
      const source = read(path);
      expect(source).toContain('.eq("city_id", cityId)');
      expect(source).toContain("city_id: cityId");
      expect(source).toContain("cityId:");
    }
  });

  it("keeps fallback district in the same city", () => {
    const source = read(
      "src/modules/districts/actions/deleteDistrict.ts",
    );

    expect(source).toContain("ensureDefaultDistrict(cityId: string)");
    expect(source).toContain('.eq("city_id", cityId)');
    expect(source).toContain("ensureDefaultDistrict(district.city_id)");
    expect(source).toContain("city_id: cityId");
  });

  it("scopes legacy bootstrap to current city", () => {
    const source = read(
      "src/modules/districts/actions/bootstrapDefaultDistricts.ts",
    );

    expect(source).toContain("resolveDistrictMutationCity");
    expect(source).toContain('.eq("city_id", cityId)');
    expect(source).toContain("city_id: cityId");
  });

  it("does not add city_id to houses or launch Kyiv", () => {
    const sql = read(
      "supabase/migrations/202608251200_p09_t6a_city_scoped_district_uniqueness.sql",
    );

    expect(sql).not.toContain("alter table public.houses");
    expect(sql.toLowerCase()).not.toContain("kyiv");
  });
});
