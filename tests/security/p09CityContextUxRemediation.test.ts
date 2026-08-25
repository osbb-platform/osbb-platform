import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 city context UX remediation", () => {
  it("uses a deterministic hard navigation after the server stores city context", () => {
    const action = read("src/modules/auth/actions/setAdminActiveCity.ts");
    const switcher = read(
      "src/modules/auth/components/AdminCitySwitcherForm.tsx",
    );

    expect(action).toContain(
      "cookieStore.set(ADMIN_ACTIVE_CITY_COOKIE, cityId",
    );
    expect(action).not.toContain('from "next/navigation"');
    expect(action).toContain("destination: normalizeReturnTo");
    expect(switcher).toContain("window.location.assign(state.destination)");
    expect(switcher).toContain("useActionState");
  });

  it("keeps the profile city selector compact instead of a full content section", () => {
    const profileSelector = read(
      "src/modules/auth/components/AdminCityProfileSelector.tsx",
    );

    expect(profileSelector).toContain("max-w-2xl");
    expect(profileSelector).toContain("Робоче місто");
    expect(profileSelector).toContain('submitLabel="Застосувати"');
    expect(profileSelector).not.toContain("<section");
    expect(profileSelector).not.toContain("Активне місто");
  });

  it("keeps the first city gate compact with one primary city action", () => {
    const gate = read(
      "src/modules/auth/components/AdminCitySelectionGate.tsx",
    );

    expect(gate).toContain("max-w-lg");
    expect(gate).toContain("<AdminCitySwitcherForm");
    expect(gate).toContain('submitLabel="Продовжити"');
    expect(gate).not.toContain("adminPrimaryButtonClass");
  });

  it("renders OSBB Platform in one line and exposes active city below it", () => {
    const logo = read("src/shared/ui/admin/AdminLogo.tsx");
    const sidebar = read("src/modules/cms/components/AdminSidebar.tsx");
    const layout = read("app/(admin)/admin/(protected)/layout.tsx");

    expect(logo).toContain("items-baseline");
    expect(logo).toContain("whitespace-nowrap");
    expect(layout).toContain(
      "activeCityName: cityContext?.cityName ?? null",
    );
    expect(sidebar).toContain("currentUser.activeCityName");
  });

  it("uses a dedicated city skyline icon while districts keep the map pin", () => {
    const icons = read("src/shared/ui/icons/AdminInlineIcons.tsx");
    const sidebar = read("src/modules/cms/components/AdminSidebar.tsx");

    expect(icons).toContain("export function CityIcon");
    expect(sidebar).toContain("icon: CityIcon");
    expect(sidebar).toMatch(
      /label: "Райони",[\s\S]*?icon: MapPinIcon/,
    );
  });

  it("counts houses through district to city without adding houses.city_id", () => {
    const service = read("src/modules/cities/services/getAdminCities.ts");

    expect(service).toContain("houses_count: number");
    expect(service).toContain('.from("houses").select("id, district_id")');
    expect(service).toContain("const districtCity = new Map<string, string>()");
    expect(service).toContain("districtCity.get(house.district_id)");
  });

  it("keeps global city metrics behind an explicit superadmin server guard", () => {
    const service = read("src/modules/cities/services/getAdminCities.ts");

    expect(service).toContain(
      "currentUser.role !== ROLES.SUPERADMIN",
    );
    expect(service).toContain("createSupabaseAdminClient()");
  });

  it("uses the canonical settings icon and bottom city metrics", () => {
    const workspace = read(
      "src/modules/cities/components/CitiesRegistryWorkspace.tsx",
    );

    expect(workspace).toContain("<AdminActionIconButton");
    expect(workspace).toContain('icon="settings"');
    expect(workspace).toContain("city.houses_count");
    expect(workspace).toContain("Будинків");
    expect(workspace).toContain("Районів");
    expect(workspace).toContain("Співробітників");
  });
});
