import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608251730_fix_plan_draft_approval_atomic.sql",
  "utf8",
);
const service = readFileSync(
  "src/modules/content-engine/v2/services/taskService.ts",
  "utf8",
);

describe("Plan draft approval atomic repair", () => {
  it("uses one security-definer RPC for Plan draft task creation", () => {
    expect(migration).toContain(
      "create or replace function public.ensure_house_plan_draft_approval_task",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.admin_has_house_access(p_house_id)");
    expect(migration).toContain("plan_task.lifecycle_status = 'draft'");
  });

  it("creates task, house, link and event inside one SQL function", () => {
    expect(migration).toContain("insert into public.platform_tasks");
    expect(migration).toContain("insert into public.platform_task_houses");
    expect(migration).toContain("insert into public.platform_task_links");
    expect(migration).toContain("insert into public.platform_task_events");
  });

  it("is idempotent for an existing active Plan draft link", () => {
    expect(migration).toContain("link.entity_type = 'house_plan_task'");
    expect(migration).toContain("link.entity_id = p_plan_task_id::text");
    expect(migration).toContain("task.deleted_at is null");
    expect(migration).toContain("if v_task_id is not null then");
  });

  it("does not expose the RPC to anon", () => {
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
  });

  it("keeps historical plan RPC but runtime uses the generic atomic RPC", () => {
    expect(service).not.toContain('if (entityType === "house_plan_task")');
    expect(service).not.toContain('"ensure_house_plan_draft_approval_task"');
    expect(service).toContain('"ensure_draft_approval_task"');
    expect(service).toContain("p_house_id: ctx.house.id");
    expect(service).toContain("p_entity_type: entityType");
    expect(service).toContain("p_entity_id: entityId");
  });
});
