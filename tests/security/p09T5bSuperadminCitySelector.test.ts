import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T5b superadmin city selector", () => {
  it("sets the exact httpOnly browser city cookie only for superadmin", () => {
    const action = read(
      "src/modules/auth/actions/setAdminActiveCity.ts",
    );

    expect(action).toContain(
      "currentUser.role !== ROLES.SUPERADMIN",
    );
    expect(action).toContain('.from("cities")');
    expect(action).toContain('.eq("is_active", true)');
    expect(action).toContain(
      "cookieStore.set(ADMIN_ACTIVE_CITY_COOKIE, cityId",
    );
    expect(action).toContain("httpOnly: true");
    expect(action).toContain('sameSite: "lax"');
    expect(action).toContain('path: "/"');
  });

  it("forces superadmin to choose a city when no context exists", () => {
    const layout = read(
      "app/(admin)/admin/(protected)/layout.tsx",
    );

    expect(layout).toContain(
      "const cityContext = await getAdminCityContext()",
    );
    expect(layout).toContain(
      "currentUser.role === ROLES.SUPERADMIN && !cityContext",
    );
    expect(layout).toContain(
      "return <AdminCitySelectionGate cities={cities} />",
    );
  });

  it("shows city switching only on the superadmin profile", () => {
    const profile = read(
      "app/(admin)/admin/(protected)/profile/page.tsx",
    );

    expect(profile).toContain(
      "currentUser?.role === ROLES.SUPERADMIN",
    );
    expect(profile).toContain("<AdminCityProfileSelector");
    expect(profile).toContain(
      "activeCityId={cityContext?.cityId ?? null}",
    );
  });

  it("clears active city cookie through the canonical server logout", () => {
    const logout = read(
      "src/modules/auth/actions/logoutAdmin.ts",
    );

    expect(logout).toContain("await supabase.auth.signOut()");
    expect(logout).toContain(
      "cookieStore.delete(ADMIN_ACTIVE_CITY_COOKIE)",
    );
  });

  it("routes idle-lock logout through canonical server logout", () => {
    const idle = read(
      "src/modules/auth/components/IdleLockProvider.tsx",
    );

    expect(idle).toContain(
      'import { logoutAdmin } from "@/src/modules/auth/actions/logoutAdmin"',
    );
    expect(idle).toContain("await logoutAdmin()");
    expect(idle).not.toMatch(
      /async function handleLogout\(\)[\s\S]*?auth\.signOut\(\)/,
    );
  });

  it("keeps city selector independent from public house routing", () => {
    const publicHouse = read(
      "src/modules/houses/services/getHouseBySlug.ts",
    );

    expect(publicHouse).not.toContain("admin-active-city");
    expect(publicHouse).not.toContain("AdminCitySelectionGate");
  });
});
