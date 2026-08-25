import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const RBAC = read("src/shared/permissions/rbac.config.ts");
const GUARDS = read("src/shared/permissions/rbac.guards.ts");

const PUBLIC_HOUSE_ROUTE_FILES = [
  "app/(public)/house/[slug]/page.tsx",
  "app/(public)/house/[slug]/announcements/page.tsx",
  "app/(public)/house/[slug]/board/page.tsx",
  "app/(public)/house/[slug]/chairman/page.tsx",
  "app/(public)/house/[slug]/debtors/page.tsx",
  "app/(public)/house/[slug]/founding-documents/page.tsx",
  "app/(public)/house/[slug]/information/page.tsx",
  "app/(public)/house/[slug]/meetings/page.tsx",
  "app/(public)/house/[slug]/plan/page.tsx",
  "app/(public)/house/[slug]/polls/page.tsx",
  "app/(public)/house/[slug]/reports/page.tsx",
  "app/(public)/house/[slug]/requisites/page.tsx",
  "app/(public)/house/[slug]/specialists/page.tsx",
] as const;

describe("P09 T9 final acceptance", () => {
  it("keeps final manager/content_manager split and conservative access-code rule", () => {
    expect(RBAC).toContain("[ROLES.CONTENT_MANAGER]");
    expect(RBAC).toContain("[ROLES.MANAGER]");
    expect(RBAC).toContain("[ROLES.ADMIN]");
    expect(RBAC).toContain("[ROLES.SUPERADMIN]");

    const contentManagerStart = RBAC.indexOf("[ROLES.CONTENT_MANAGER]");
    const managerStart = RBAC.indexOf("[ROLES.MANAGER]");
    const adminStart = RBAC.indexOf("[ROLES.ADMIN]");

    const contentManagerBlock = RBAC.slice(contentManagerStart, managerStart);
    const managerBlock = RBAC.slice(managerStart, adminStart);

    expect(contentManagerBlock).toContain("employees: false");
    expect(contentManagerBlock).toContain("publish: false");

    expect(managerBlock).toContain("employees: false");
    expect(managerBlock).toContain("changeAccessCode: false");
    expect(managerBlock).toContain("changeHouseAccessCodes: false");
    expect(managerBlock).toContain("publish: true");
  });

  it("content_manager keeps draft/edit capability but no publish capability", () => {
    expect(RBAC).toContain("contentManagerWorkspaces.announcements");
    expect(RBAC).toContain("contentManagerWorkspaces.information");
    expect(RBAC).toContain("contentManagerWorkspaces.reports");
    expect(RBAC).toContain("contentManagerWorkspaces.plan");
    expect(RBAC).toContain("contentManagerWorkspaces.meetings");
    expect(RBAC).toContain("contentManagerWorkspaces.polls");
    expect(RBAC).toContain("contentManagerWorkspaces.specialists");
    expect(RBAC).toContain("contentManagerWorkspaces.debtors");
    expect(RBAC).toContain("contentManagerWorkspaces.foundingDocuments");

    expect(RBAC).toMatch(
      /contentManagerWorkspaces\.announcements\s*=\s*\{[\s\S]*?saveDraft:\s*true[\s\S]*?publish:\s*false/,
    );
    expect(RBAC).toMatch(
      /contentManagerWorkspaces\.information\s*=\s*\{[\s\S]*?saveDraft:\s*true[\s\S]*?publish:\s*false/,
    );
    expect(RBAC).toMatch(
      /contentManagerWorkspaces\.reports\s*=\s*\{[\s\S]*?saveDraft:\s*true[\s\S]*?publish:\s*false/,
    );
  });

  it("manager publish is enabled while employees route remains forbidden", () => {
    const managerStart = RBAC.indexOf("[ROLES.MANAGER]");
    const adminStart = RBAC.indexOf("[ROLES.ADMIN]");
    const managerBlock = RBAC.slice(managerStart, adminStart);

    expect(managerBlock).toContain("employees: false");
    expect(managerBlock).toMatch(/announcements:\s*\{[\s\S]*?publish:\s*true/);
    expect(managerBlock).toMatch(/board:\s*\{[\s\S]*?publish:\s*true/);
    expect(managerBlock).toMatch(/reports:\s*\{[\s\S]*?publish:\s*true/);
    expect(managerBlock).toMatch(/polls:\s*\{[\s\S]*?publish:\s*true/);

    const employeesPage = read(
      "app/(admin)/admin/(protected)/employees/page.tsx",
    );
    expect(employeesPage).toContain(
      'assertTopLevelAccess(currentUser.role, "employees")',
    );

    expect(GUARDS).toContain("assertTopLevelAccess");
    expect(GUARDS).toContain("FORBIDDEN");
  });

  it("preserves all 13 public house routes", () => {
    expect(PUBLIC_HOUSE_ROUTE_FILES).toHaveLength(13);

    for (const path of PUBLIC_HOUSE_ROUTE_FILES) {
      expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
    }
  });

  it("public house routes and slug read model are independent of admin city cookie", () => {
    for (const path of PUBLIC_HOUSE_ROUTE_FILES) {
      const source = read(path);

      expect(source).not.toContain("getAdminCityContext");
      expect(source).not.toContain("ADMIN_ACTIVE_CITY_COOKIE");
      expect(source).not.toContain("admin-active-city");
    }

    const publicHouseService = read(
      "src/modules/houses/services/getHouseBySlug.ts",
    );

    expect(publicHouseService).not.toContain("getAdminCityContext");
    expect(publicHouseService).not.toContain("ADMIN_ACTIVE_CITY_COOKIE");
    expect(publicHouseService).not.toContain("admin-active-city");
  });

  it("superadmin city selection uses cookie while ordinary roles use membership city", () => {
    const source = read(
      "src/modules/auth/services/getAdminCityContext.ts",
    );

    expect(source).toContain(
      'export const ADMIN_ACTIVE_CITY_COOKIE = "admin-active-city"',
    );
    expect(source).toContain("currentUser.role === ROLES.SUPERADMIN");
    expect(source).toContain("cookieStore.get(ADMIN_ACTIVE_CITY_COOKIE)");
    expect(source).toContain("currentUser.membershipCityId");
    expect(source).toContain('source: "superadmin-cookie"');
    expect(source).toContain('source: "membership"');
  });

  it("logout clears selected city context", () => {
    const source = read("src/modules/auth/actions/logoutAdmin.ts");

    expect(source).toContain("ADMIN_ACTIVE_CITY_COOKIE");
    expect(source).toContain("cookieStore.delete(ADMIN_ACTIVE_CITY_COOKIE)");
  });

  it("supports an empty city without automatically launching Kyiv", () => {
    const createCity = read("src/modules/cities/actions/createCity.ts");
    const houses = read("src/modules/houses/services/getAdminHouses.ts");
    const districts = read(
      "src/modules/districts/services/getAdminDistricts.ts",
    );

    expect(createCity).not.toMatch(/київ|kyiv/i);
    expect(createCity).not.toContain("createHouse");
    expect(createCity).not.toContain("bootstrapDefaultDistricts");

    expect(houses).toContain("getAdminCityScope");
    expect(districts).toContain("getAdminCityScope");
  });

  it("employee mutations retain explicit city guards", () => {
    const resolver = read(
      "src/modules/employees/services/resolveEmployeeMutationScope.ts",
    );
    const createEmployee = read(
      "src/modules/employees/actions/createEmployee.ts",
    );
    const updateEmployee = read(
      "src/modules/employees/actions/updateEmployee.ts",
    );
    const deleteEmployee = read(
      "src/modules/employees/actions/deleteEmployee.ts",
    );
    const inviteEmployee = read(
      "src/modules/employees/actions/sendEmployeeInvite.ts",
    );

    expect(resolver).toContain("ROLES.ADMIN");
    expect(resolver).toContain("ROLES.SUPERADMIN");
    expect(resolver).toContain("requestedCityId");
    expect(resolver).toContain("cityContext.cityId");
    expect(resolver).toContain("canMutateEmployeeInCity");

    expect(createEmployee).toContain("resolveEmployeeMutationScope");
    expect(updateEmployee).toContain("canMutateEmployeeInCity");
    expect(deleteEmployee).toContain("canMutateEmployeeInCity");
    expect(inviteEmployee).toContain("canMutateEmployeeInCity");
  });

  it("keeps all P09 direct real-DB isolation suites", () => {
    const files = [
      "tests/security/p09R0TenantIsolationRealDb.test.ts",
      "tests/security/p09R02ApartmentsHouseAccessRealDb.test.ts",
      "tests/security/p09R03ContentScopeRealDb.test.ts",
      "tests/security/p09R04TasksHistoryDebtorsRealDb.test.ts",
      "tests/security/p09T8ContractorsRealDb.test.ts",
    ];

    for (const path of files) {
      expect(existsSync(resolve(process.cwd(), path)), path).toBe(true);
    }
  });
});
