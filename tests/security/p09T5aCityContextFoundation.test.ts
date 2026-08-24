import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T5a server-side city context foundation", () => {
  it("carries membership city_id in CurrentAdminUser", () => {
    const types = read("src/shared/types/entities/admin.types.ts");
    const currentUser = read("src/modules/auth/services/getCurrentAdminUser.ts");

    expect(types).toContain("membershipCityId: string | null");
    expect(currentUser).toContain("city_id: string | null");
    expect(currentUser).toContain("house_id, city_id, created_at, updated_at");
    expect(currentUser).toContain("membershipCityId: bestMembership?.city_id ?? null");
  });

  it("uses the exact city-context cookie only for superadmin", () => {
    const cityContext = read("src/modules/auth/services/getAdminCityContext.ts");

    expect(cityContext).toContain('ADMIN_ACTIVE_CITY_COOKIE = "admin-active-city"');
    expect(cityContext).toContain("currentUser.role === ROLES.SUPERADMIN");
    expect(cityContext).toContain("cookieStore.get(ADMIN_ACTIVE_CITY_COOKIE)");
    expect(cityContext).toContain("currentUser.membershipCityId");
    expect(cityContext).toContain('source: "membership"');
    expect(cityContext).toContain('source: "superadmin-cookie"');
  });

  it("validates selected cities against active cities", () => {
    const cityContext = read("src/modules/auth/services/getAdminCityContext.ts");
    expect(cityContext).toContain('.from("cities")');
    expect(cityContext).toContain('.eq("id", cityId)');
    expect(cityContext).toContain('.eq("is_active", true)');
  });

  it("adds district city_id to the admin house detail read model", () => {
    const house = read("src/modules/houses/services/getAdminHouseById.ts");
    expect(house).toContain("city_id: string");
    expect(house).toMatch(/district:districts\s*\([\s\S]*?theme_color,[\s\S]*?city_id[\s\S]*?\)/);
  });

  it("enforces active city context inside Command Bus", () => {
    const context = read("src/modules/content-engine/v2/context.ts");
    const pipeline = read("src/modules/content-engine/v2/types/pipeline.ts");

    expect(context).toContain('getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext"');
    expect(context).toContain("const cityContext = await getAdminCityContext()");
    expect(context).toContain("house.district.city_id !== cityContext.cityId");
    expect(context).toContain("Будинок недоступний у поточному міському контексті.");
    expect(pipeline).toMatch(/city:\s*\{[\s\S]*?id:\s*string;[\s\S]*?name:\s*string;[\s\S]*?slug:\s*string;/);
  });

  it("does not touch public house slug routing", () => {
    const publicHouse = read("src/modules/houses/services/getHouseBySlug.ts");
    expect(publicHouse).not.toContain("admin-active-city");
    expect(publicHouse).not.toContain("getAdminCityContext");
  });
});
