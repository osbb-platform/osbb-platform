import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const roles = read("src/shared/constants/roles/roles.constants.ts");
const rbac = read("src/shared/permissions/rbac.config.ts");
const auth = read("src/modules/auth/services/getCurrentAdminUser.ts");
const form = read("src/modules/employees/components/CreateEmployeeForm.tsx");
const action = read("src/modules/employees/actions/createEmployee.ts");
const leadForm = read("src/modules/site/components/blocks/LeadForm.tsx");
const leadAction = read("src/modules/site/actions/submitSiteLead.ts");

describe("P09 T4 transitional role compatibility", () => {
  it("adds content_manager while retaining legacy manager", () => {
    expect(roles).toContain('MANAGER: "manager"');
    expect(roles).toContain('CONTENT_MANAGER: "content_manager"');
    expect(roles).toContain(
      "role === ROLES.MANAGER || role === ROLES.CONTENT_MANAGER",
    );
  });

  it("makes content_manager an exact transitional inheritance alias of OLD manager", () => {
    expect(rbac).toMatch(
      /\[ROLES\.CONTENT_MANAGER\]:\s*\{[\s\S]*?inherits:\s*\[ROLES\.MANAGER\][\s\S]*?topLevel:\s*\{\}[\s\S]*?housesRegistry:\s*\{\}[\s\S]*?apartmentsRegistry:\s*\{\}[\s\S]*?employees:\s*\{\}[\s\S]*?houseWorkspaces:\s*\{\}[\s\S]*?security:\s*\{\}[\s\S]*?\},/,
    );
  });

  it("does not activate future manager powers in the legacy manager definition", () => {
    const managerStart = rbac.indexOf("[ROLES.MANAGER]:");
    const contentManagerStart = rbac.indexOf("[ROLES.CONTENT_MANAGER]:");

    expect(managerStart).toBeGreaterThanOrEqual(0);
    expect(contentManagerStart).toBeGreaterThan(managerStart);

    const managerBlock = rbac.slice(managerStart, contentManagerStart);

    expect(managerBlock).toContain("changeAccessCode: false");
    expect(managerBlock).toContain("createManager: false");
    expect(managerBlock).toContain("updateRole: false");
    expect(managerBlock).toContain("changeHouseAccessCodes: false");

    expect(managerBlock).toContain("houseWorkspaces: managerWorkspaces");

    expect(rbac).toMatch(
      /managerWorkspaces\.announcements\s*=\s*\{[\s\S]*?publish:\s*false/,
    );
    expect(rbac).toMatch(
      /managerWorkspaces\.polls\s*=\s*\{[\s\S]*?publish:\s*false/,
    );
    expect(rbac).toMatch(
      /managerWorkspaces\.debtors\s*=\s*\{[\s\S]*?publish:\s*false/,
    );
  });

  it("keeps admin inheriting from legacy manager during transition", () => {
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:\s*\{[\s\S]*?inherits:\s*\[ROLES\.MANAGER\]/,
    );
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:[\s\S]*?createManager:\s*true/,
    );
    expect(rbac).toMatch(
      /\[ROLES\.ADMIN\]:[\s\S]*?announcements:\s*\{[\s\S]*?publish:\s*true/,
    );
  });

  it("normalizes content_manager in current-admin auth", () => {
    expect(auth).toContain(
      "if (value === ROLES.CONTENT_MANAGER) return ROLES.CONTENT_MANAGER;",
    );
    expect(auth).toContain(
      "normalizedRole === ROLES.CONTENT_MANAGER",
    );
  });

  it("creates new transitional content staff as content_manager", () => {
    expect(form).toContain("defaultValue={ROLES.CONTENT_MANAGER}");
    expect(form).toContain(
      '<option value={ROLES.CONTENT_MANAGER}>Контент-менеджер</option>',
    );
    expect(form).not.toContain('<option value={ROLES.MANAGER}>Manager</option>');

    expect(action).toContain(
      "role === ROLES.ADMIN || role === ROLES.CONTENT_MANAGER ? role : null",
    );
  });

  it("does not touch public lead-type manager semantics", () => {
    expect(leadForm).toContain('value: "manager"');
    expect(leadAction).toContain('"manager"');
  });
});
