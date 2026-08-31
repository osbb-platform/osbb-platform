import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/202608311210_ensure_draft_approval_task_atomic.sql";
const migration = readFileSync(migrationPath, "utf8");
const taskService = readFileSync(
  "src/modules/content-engine/v2/services/taskService.ts",
  "utf8",
);

describe("S1-T3 generic atomic draft approval RPC contract", () => {
  it("defines the generic SECURITY DEFINER RPC with required signature", () => {
    expect(migration).toContain(
      "create or replace function public.ensure_draft_approval_task",
    );
    expect(migration).toContain("p_house_id uuid");
    expect(migration).toContain("p_entity_type text");
    expect(migration).toContain("p_entity_id text");
    expect(migration).toContain("p_title text");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
  });

  it("uses the complete runtime whitelist discovered from tasks.ensure", () => {
    for (const entityType of [
      "house_announcement",
      "house_document",
      "house_information_post",
      "house_meeting",
      "house_plan_task",
      "house_poll",
      "house_report",
      "house_specialist",
    ]) {
      expect(migration).toContain(`'${entityType}'`);
    }
    expect(migration).toContain("UNSUPPORTED_DRAFT_ENTITY_TYPE");
  });

  it("verifies house access and entity house/draft ownership", () => {
    expect(migration).toContain("admin_has_house_access(p_house_id)");
    for (const table of [
      "house_announcements",
      "house_documents",
      "house_information_posts",
      "house_meetings",
      "house_plan_tasks",
      "house_polls",
      "house_reports",
      "house_specialists",
    ]) {
      expect(migration).toContain(`from public.${table} e`);
    }
    expect(migration).toContain("e.house_id = p_house_id");
    expect(migration).toContain("e.lifecycle_status = 'draft'");
    expect(migration).toContain("DRAFT_ENTITY_NOT_FOUND");
  });

  it("is idempotent and atomically creates task, house, link and event", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("from public.platform_task_links link");
    expect(migration).toContain("insert into public.platform_tasks");
    expect(migration).toContain("insert into public.platform_task_houses");
    expect(migration).toContain("insert into public.platform_task_links");
    expect(migration).toContain("insert into public.platform_task_events");
  });

  it("taskService routes every tasks.ensure through generic RPC", () => {
    expect(taskService).toContain('"ensure_draft_approval_task"');
    expect(taskService).toContain("p_house_id: ctx.house.id");
    expect(taskService).toContain("p_entity_type: entityType");
    expect(taskService).toContain("p_entity_id: entityId");
    expect(taskService).toContain("p_title: title");
  });

  it("removes the plan-only runtime special case after generic parity", () => {
    expect(taskService).not.toContain('if (entityType === "house_plan_task")');
    expect(taskService).not.toContain(
      '"ensure_house_plan_draft_approval_task"',
    );
  });

  it("keeps historical plan RPC migration in forward history", () => {
    expect(
      existsSync(
        "supabase/migrations/202608251730_fix_plan_draft_approval_atomic.sql",
      ),
    ).toBe(true);
  });
});
