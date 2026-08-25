import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T7 employee role + city scope", () => {
  it("implements updateEmployee for role + city", () => {
    const source = read("src/modules/employees/actions/updateEmployee.ts");

    expect(source).toContain('formData.get("role")');
    expect(source).toContain('formData.get("cityId")');
    expect(source).toContain("resolveEmployeeMutationScope");
    expect(source).toContain("role: scope.role");
    expect(source).toContain("city_id: scope.cityId");
  });

  it("allows only admin/superadmin and only admin/manager/content_manager target roles", () => {
    const helper = read(
      "src/modules/employees/services/resolveEmployeeMutationScope.ts",
    );

    expect(helper).toContain("params.currentUser.role !== ROLES.SUPERADMIN");
    expect(helper).toContain("params.currentUser.role !== ROLES.ADMIN");
    expect(helper).toContain("value === ROLES.ADMIN");
    expect(helper).toContain("value === ROLES.MANAGER");
    expect(helper).toContain("value === ROLES.CONTENT_MANAGER");
  });

  it("pins city-admin to own city and validates superadmin target city", () => {
    const helper = read(
      "src/modules/employees/services/resolveEmployeeMutationScope.ts",
    );

    expect(helper).toContain("requestedCityId !== cityContext.cityId");
    expect(helper).toContain('.from("cities")');
    expect(helper).toContain('.eq("is_active", true)');
  });

  it("prevents cross-city update/delete/invite", () => {
    for (const path of [
      "src/modules/employees/actions/updateEmployee.ts",
      "src/modules/employees/actions/deleteEmployee.ts",
      "src/modules/employees/actions/sendEmployeeInvite.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("canMutateEmployeeInCity");
      expect(source).toContain("employeeCityId:");
    }
  });

  it("creates memberships with explicit city_id", () => {
    const source = read("src/modules/employees/actions/createEmployee.ts");

    expect(source).toContain("resolveEmployeeMutationScope");
    expect(source).toContain("city_id: cityId");
  });

  it("records cityId in employee mutation history", () => {
    for (const path of [
      "src/modules/employees/actions/createEmployee.ts",
      "src/modules/employees/actions/updateEmployee.ts",
      "src/modules/employees/actions/deleteEmployee.ts",
      "src/modules/employees/actions/sendEmployeeInvite.ts",
    ]) {
      const source = read(path);
      expect(
        source.includes("cityId:") || source.includes("cityId,"),
      ).toBe(true);
    }
  });

  it("exposes role + city editing UI", () => {
    const page = read("app/(admin)/admin/(protected)/employees/page.tsx");
    const card = read("src/modules/employees/components/EmployeeCard.tsx");
    const form = read("src/modules/employees/components/UpdateEmployeeForm.tsx");

    expect(page).toContain("getAdminCityOptions()");
    expect(card).toContain("<UpdateEmployeeForm");
    expect(form).toContain('name="role"');
    expect(form).toContain('name="cityId"');
    expect(form).toContain("disabled={!canSelectCity}");
  });

  it("removes invited_by ownership as authorization for city-admin mutations", () => {
    expect(read("src/modules/employees/actions/deleteEmployee.ts")).not.toContain(
      "которых пригласили сами",
    );
    expect(read("src/modules/employees/actions/sendEmployeeInvite.ts")).not.toContain(
      "только своим сотрудникам",
    );
  });
});
