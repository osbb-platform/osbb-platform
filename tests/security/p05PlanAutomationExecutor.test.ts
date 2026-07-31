import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202607241000_add_plan_automation_executor.sql",
  "utf8",
);
const normalized = sql.replace(/\s+/g, " ").toLowerCase();

describe("P05 T6.1 automation executor", () => {
  it("creates a security-definer executor with fixed search path", () => {
    expect(normalized).toContain(
      "create or replace function public.run_house_plan_automation",
    );
    expect(normalized).toContain("security definer");
    expect(normalized).toContain("set search_path = public, pg_temp");
  });

  it("is available only to service role", () => {
    expect(normalized).toContain(
      "revoke all on function public.run_house_plan_automation",
    );
    expect(normalized).toContain("from public, anon, authenticated");
    expect(normalized).toContain(
      "grant execute on function public.run_house_plan_automation",
    );
    expect(normalized).toContain("to service_role");
  });

  it("selects only due published active automation tasks", () => {
    expect(normalized).toContain("task.lifecycle_status = 'published'");
    expect(normalized).toContain("task.automation_enabled = true");
    expect(normalized).toContain(
      "task.automation_interval_days is not null",
    );
    expect(normalized).toContain("task.automation_paused_at is null");
    expect(normalized).toContain(
      "task.automation_next_due_at is not null",
    );
    expect(normalized).toContain(
      "task.automation_next_due_at <= p_now",
    );
    expect(normalized).toContain("task.task_status <> 'archived'");
  });

  it("uses deterministic concurrency-safe batching", () => {
    expect(normalized).toContain(
      "order by task.automation_next_due_at, task.id",
    );
    expect(normalized).toContain("for update skip locked");
    expect(normalized).toContain("limit p_batch_size");
    expect(normalized).toContain("invalid_batch_size");
  });

  it("implements the fixed lifecycle and catch-up loop", () => {
    expect(normalized).toContain(
      "when 'planned' then 'in_progress'",
    );
    expect(normalized).toContain(
      "when 'in_progress' then 'completed'",
    );
    expect(normalized).toContain(
      "when 'completed' then 'archived'",
    );
    expect(normalized).toContain("while v_due_at is not null");
    expect(normalized).toContain("and v_due_at <= p_now");
  });

  it("writes immutable automatic journal rows with due timestamps", () => {
    expect(normalized).toContain(
      "insert into public.house_plan_status_transitions",
    );
    expect(normalized).toContain("'automatic'");
    expect(normalized).toContain("v_due_at");
    expect(normalized).toContain("actor_admin_id");
    expect(normalized).toContain("configured_interval_days");
    expect(normalized).toContain(
      "on conflict ( task_id, from_status, to_status, due_at )",
    );
    expect(normalized).toContain("where kind = 'automatic'");
    expect(normalized).toContain("do nothing");
  });

  it("advances lock and stops scheduling after archived", () => {
    expect(normalized).toContain(
      "lock_version = lock_version + 1",
    );
    expect(normalized).toContain(
      "when v_to_status = 'archived' then null",
    );
    expect(normalized).toContain(
      "v_archived_count := v_archived_count + 1",
    );
  });

  it("returns a compact execution summary", () => {
    expect(normalized).toContain("'processedtasks'");
    expect(normalized).toContain("'transitions'");
    expect(normalized).toContain("'archivedtasks'");
    expect(normalized).toContain("'executedat'");
  });
});
