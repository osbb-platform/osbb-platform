import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("P09 T4 transition sequence remains explicit after activation", () => {
  it("keeps both role literals and the completed T3b migration", () => {
    const roles = read("src/shared/constants/roles/roles.constants.ts");
    const migration = read(
      "supabase/migrations/202608242100_p09_t3b_migrate_manager_to_content_manager.sql",
    );

    expect(roles).toContain('MANAGER: "manager"');
    expect(roles).toContain('CONTENT_MANAGER: "content_manager"');
    expect(migration).toContain(
      "set role = 'content_manager'::public.admin_role",
    );
    expect(migration).toContain("where role::text = 'manager'");
  });

  it("retains DB compatibility for both enum literals", () => {
    const migration = read(
      "supabase/migrations/202608242030_p09_t4_transitional_get_my_admin_role.sql",
    );

    expect(migration).toContain("when 'manager' then 3");
    expect(migration).toContain("when 'content_manager' then 4");
  });

  it("does not change public lead-type manager semantics", () => {
    expect(
      read("src/modules/site/components/blocks/LeadForm.tsx"),
    ).toContain('value: "manager"');
    expect(
      read("src/modules/site/actions/submitSiteLead.ts"),
    ).toContain('"manager"');
  });
});
