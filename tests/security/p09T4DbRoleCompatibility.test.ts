import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608242030_p09_t4_transitional_get_my_admin_role.sql",
  ),
  "utf8",
).toLowerCase();

describe("P09 T4 transitional DB role compatibility", () => {
  it("replaces only the role helper contract", () => {
    expect(migration).toContain(
      "create or replace function public.get_my_admin_role()",
    );
    expect(migration).not.toMatch(/update\s+public\.admin_memberships/);
    expect(migration).not.toMatch(/set\s+role\s*=/);
  });

  it("recognizes content_manager without removing manager", () => {
    expect(migration).toContain("when 'manager' then 3");
    expect(migration).toContain("when 'content_manager' then 4");
  });

  it("preserves active global-membership filtering", () => {
    expect(migration).toContain("am.is_active = true");
    expect(migration).toContain("am.house_id is null");
    expect(migration).toContain("am.status = 'active'");
  });

  it("keeps execute limited away from anon/public", () => {
    expect(migration).toContain(
      "revoke all on function public.get_my_admin_role() from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.get_my_admin_role() to authenticated, service_role",
    );
  });
});
