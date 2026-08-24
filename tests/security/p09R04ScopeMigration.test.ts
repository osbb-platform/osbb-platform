import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608241830_p09_r0_4_tasks_history_debt_scope.sql"), "utf8");
describe("P09 R0.4 migration contract", () => {
  it("scopes history and debtor admin paths", () => {
    expect(sql).toContain("p09_house_content_history_admin_select");
    expect(sql).toContain("p09_house_debtors_items_admin_scoped");
    expect(sql).not.toContain("membership.house_id is null");
  });
  it("scopes complete platform task graph", () => {
    expect(sql).toContain("admin_has_platform_task_access");
    for (const table of ["platform_tasks","platform_task_houses","platform_task_comments","platform_task_events","platform_task_links"]) expect(sql, table).toContain(table);
    expect(sql).toContain("not public.admin_has_house_access(th.house_id)");
  });
  it("hardens legacy SECURITY DEFINER entry points", () => {
    expect(sql).toMatch(/publish_house_debtors_draft[\s\S]*admin_has_house_access\(p_house_id\)/i);
    expect(sql).toMatch(/cleanup_platform_tasks[\s\S]*admin_is_superadmin\(\)/i);
  });
  it("does not rewrite import buffer", () => {
    expect(sql).not.toMatch(/drop policy .*import_buffer/i);
    expect(sql).not.toMatch(/create policy .*import_buffer/i);
  });
  it("does not replace public debtor history RPC", () => {
    expect(sql).not.toMatch(/create or replace function public\.get_public_house_debtor_history/i);
  });
});
