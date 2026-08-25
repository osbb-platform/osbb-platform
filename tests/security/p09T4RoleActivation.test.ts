import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const roles = read("src/shared/constants/roles/roles.constants.ts");
const rbac = read("src/shared/permissions/rbac.config.ts");
const apartments = read(
  "src/modules/apartments/components/ApartmentsRegistryWorkspace.tsx",
);
const createForm = read(
  "src/modules/employees/components/CreateEmployeeForm.tsx",
);
const createAction = read(
  "src/modules/employees/actions/createEmployee.ts",
);

describe("P09 T4 final role activation", () => {
  it("separates manager from content_manager helpers", () => {
    expect(roles).toContain("return role === ROLES.MANAGER;");
    expect(roles).toContain(
      "return role === ROLES.CONTENT_MANAGER;",
    );
    expect(roles).toMatch(
      /canApproveHouseContent[\s\S]*?ROLES\.MANAGER/,
    );
  });

  it("keeps content_manager draft-only and removes registry surfaces", () => {
    const start = rbac.indexOf("[ROLES.CONTENT_MANAGER]:");
    const end = rbac.indexOf("[ROLES.MANAGER]:");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = rbac.slice(start, end);

    expect(block).toContain("districts: false");
    expect(block).toContain("houses: false");
    expect(block).toContain("apartments: false");
    expect(block).toContain("employees: false");
    expect(block).toContain("view: false");
    expect(block).toContain("houseWorkspaces: contentManagerWorkspaces");
    expect(rbac).toMatch(
      /contentManagerWorkspaces\.announcements\s*=\s*\{[\s\S]*?publish:\s*false/,
    );
    expect(rbac).toMatch(
      /contentManagerWorkspaces\.polls\s*=\s*\{[\s\S]*?publish:\s*false/,
    );
  });

  it("activates manager houses + import + publish without employees or codes", () => {
    const start = rbac.indexOf("[ROLES.MANAGER]:");
    const end = rbac.indexOf("[ROLES.ADMIN]:");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const block = rbac.slice(start, end);

    expect(block).toContain("inherits: [ROLES.CONTENT_MANAGER]");
    expect(block).toContain("houses: true");
    expect(block).toContain("apartments: true");
    expect(block).toContain("employees: false");

    expect(block).toContain("create: true");
    expect(block).toContain("edit: true");
    expect(block).toContain("archive: true");
    expect(block).toContain("restore: true");
    expect(block).toContain("delete: true");

    expect(block).toContain("importReplace: true");
    expect(block).toContain("createManual: false");
    expect(block).toContain("archiveOne: false");
    expect(block).toContain("archiveAll: false");

    expect(block).toContain("createManager: false");
    expect(block).toContain("updateRole: false");
    expect(block).toContain("changeAccessCode: false");
    expect(block).toContain("changeHouseAccessCodes: false");

    expect(block).toMatch(
      /announcements:\s*\{[\s\S]*?publish:\s*true/,
    );
    expect(block).toMatch(
      /polls:\s*\{[\s\S]*?publish:\s*true/,
    );
    expect(block).toMatch(
      /debtors:\s*\{[\s\S]*?publish:\s*true/,
    );
  });

  it("keeps admin inheriting manager and retaining employee management", () => {
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:\s*\{[\s\S]*?inherits:\s*\[ROLES\.MANAGER\]/,
    );
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:[\s\S]*?createManager:\s*true/,
    );
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:[\s\S]*?updateRole:\s*true/,
    );
  });

  it("separates apartment import UI from manual/archive UI", () => {
    expect(apartments).toContain(
      "const canImportRegistry = access.apartmentsRegistry.importReplace;",
    );
    expect(apartments).toContain(
      "const canCreateManual = access.apartmentsRegistry.createManual;",
    );
    expect(apartments).toContain(
      "const canArchiveAll = access.apartmentsRegistry.archiveAll;",
    );
    expect(apartments).toContain(
      "const canArchiveOne = access.apartmentsRegistry.archiveOne;",
    );
    expect(apartments).not.toContain("const canMutateRegistry =");
  });

  it("allows authorized admins to create manager or content_manager", () => {
    expect(createForm).toContain(
      '<option value={ROLES.MANAGER}>Manager</option>',
    );
    expect(createForm).toContain(
      '<option value={ROLES.CONTENT_MANAGER}>Контент-менеджер</option>',
    );
    expect(createAction).toContain("resolveEmployeeMutationScope");
    const employeeScope = read(
      "src/modules/employees/services/resolveEmployeeMutationScope.ts",
    );
    expect(employeeScope).toContain("value === ROLES.MANAGER");
    expect(employeeScope).toContain("value === ROLES.CONTENT_MANAGER");
  });
});
