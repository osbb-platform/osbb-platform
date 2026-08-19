import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  "supabase/migrations/202608190001_backfill_plan_automation_schedule.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");

describe("P11 plan automation backfill migration", () => {
  it("targets only enabled published non-paused tasks with a missing due date", () => {
    expect(sql).toContain("automation_enabled = true");
    expect(sql).toContain("lifecycle_status = 'published'");
    expect(sql).toContain("automation_paused_at is null");
    expect(sql).toContain("automation_interval_days is not null");
    expect(sql).toContain("automation_next_due_at is null");
    expect(sql).toContain("task_status <> 'archived'");
  });

  it("starts a new full interval from migration execution time", () => {
    expect(sql).toContain("automation_anchor_at = now()");
    expect(sql).toContain(
      "now() + make_interval(days => automation_interval_days)",
    );
  });

  it("advances optimistic lock metadata", () => {
    expect(sql).toContain("updated_at = now()");
    expect(sql).toContain("lock_version = lock_version + 1");
  });

  it("does not modify schema or journal tables", () => {
    expect(sql).not.toMatch(/\balter\s+table\b/i);
    expect(sql).not.toMatch(/\bcreate\s+table\b/i);
    expect(sql).not.toContain("house_plan_status_transitions");
  });
});
