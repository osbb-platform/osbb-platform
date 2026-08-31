import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/202608312015_s3_t5_house_plan_completed_at.sql";

describe("S3-T5 house plan completed_at model", () => {
  it("adds nullable completed_at to house_plan_tasks", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain(
      "add column if not exists completed_at timestamptz null",
    );
  });

  it("backfills completed tasks from latest completed transition, then updated_at fallback", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("max(transition.executed_at)");
    expect(sql).toContain("to_status = 'completed'");
    expect(sql).toContain("coalesce(completed_transition.completed_at, task.updated_at)");
    expect(sql).toContain("where task.task_status = 'completed'");
  });

  it("uses one database trigger to cover manual/update/automation status changes", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("create or replace function public.sync_house_plan_completed_at()");
    expect(sql).toContain("before insert or update of task_status");
    expect(sql).toContain("on public.house_plan_tasks");
  });

  it("sets, clears, and refreshes completion time by transition direction", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("new.task_status = 'completed'");
    expect(sql).toContain("old.task_status is distinct from 'completed'");
    expect(sql).toContain("new.completed_at := clock_timestamp()");
    expect(sql).toContain("new.completed_at := null");
  });
});
