import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T6b cities admin UI", () => {
  it("adds cities as a top-level section visible only to superadmin", () => {
    const types = read("src/shared/permissions/rbac.types.ts");
    const config = read("src/shared/permissions/rbac.config.ts");

    expect(types).toContain('| "cities"');
    expect(config).toContain("cities: false");
    expect(config).toContain("[ROLES.SUPERADMIN]");
    expect(config).toContain("topLevel: allowAllTopLevel()");
  });

  it("adds /admin/cities route and sidebar item", () => {
    const routes = read("src/shared/config/routes/routes.config.ts");
    const sidebar = read("src/modules/cms/components/AdminSidebar.tsx");
    const page = read("app/(admin)/admin/(protected)/cities/page.tsx");

    expect(routes).toContain('cities: "/cities"');
    expect(routes).toContain('cities: "/admin/cities"');
    expect(sidebar).toContain("ROUTES.admin.cities");
    expect(sidebar).toContain("access.topLevel.cities");
    expect(page).toContain('assertTopLevelAccess(currentUser?.role, "cities")');
  });

  it("enforces superadmin-only city CRUD on the server", () => {
    for (const path of [
      "src/modules/cities/actions/createCity.ts",
      "src/modules/cities/actions/updateCity.ts",
      "src/modules/cities/actions/deleteCity.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("currentUser.role !== ROLES.SUPERADMIN");
      expect(source).toContain('.from("cities")');
    }
  });

  it("prevents unsafe city deletion", () => {
    const source = read("src/modules/cities/actions/deleteCity.ts");

    expect(source).toContain("cityContext?.cityId === cityId");
    expect(source).toContain('.from("districts")');
    expect(source).toContain('.from("admin_memberships")');
    expect(source).toContain(
      "Місто не можна видалити, поки до нього прив’язані райони або співробітники.",
    );
  });

  it("records cityId in city CRUD history metadata", () => {
    for (const path of [
      "src/modules/cities/actions/createCity.ts",
      "src/modules/cities/actions/updateCity.ts",
      "src/modules/cities/actions/deleteCity.ts",
    ]) {
      expect(read(path)).toContain("cityId:");
    }
  });

  it("passes city options to district form and only superadmin can switch them", () => {
    const page = read("app/(admin)/admin/(protected)/districts/page.tsx");
    const workspace = read(
      "src/modules/districts/components/DistrictsRegistryWorkspace.tsx",
    );

    expect(page).toContain("isSuperadmin ? getAdminCityOptions()");
    expect(page).toContain("activeCityId={cityContext?.cityId ?? null}");
    expect(workspace).toContain('name="cityId"');
    expect(workspace).toContain(
      "const canSelectCity = currentUserRole === ROLES.SUPERADMIN",
    );
    expect(workspace).toContain("disabled={!canSelectCity}");
  });

  it("keeps district list city-scoped and public routing unchanged", () => {
    const districtService = read(
      "src/modules/districts/services/getAdminDistricts.ts",
    );
    const publicHouse = read(
      "src/modules/houses/services/getHouseBySlug.ts",
    );

    expect(districtService).toContain('.eq("city_id", scope.cityId)');
    expect(districtService).toContain("city_id: string");
    expect(publicHouse).not.toContain("getAdminCities");
    expect(publicHouse).not.toContain("ROUTES.admin.cities");
  });
});
