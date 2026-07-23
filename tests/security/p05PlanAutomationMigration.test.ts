import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607231520_add_plan_automation_model.sql",
  "utf8",
);

describe("P05 T4 plan automation migration", () => {
  it("adds all automation columns additively with automation disabled", () => {
    expect(migration).toContain(
      "add column if not exists automation_enabled boolean not null default false",
    );
    expect(migration).toContain(
      "add column if not exists automation_interval_days integer null",
    );
    expect(migration).toContain(
      "add column if not exists automation_paused_at timestamptz null",
    );
    expect(migration).toContain(
      "add column if not exists automation_anchor_at timestamptz null",
    );
    expect(migration).toContain(
      "add column if not exists automation_next_due_at timestamptz null",
    );
  });

  it("enforces interval and pause invariants", () => {
    expect(migration).toContain(
      "automation_interval_days between 1 and 365",
    );
    expect(migration).toContain(
      "automation_enabled = false",
    );
    expect(migration).toContain(
      "automation_paused_at is null",
    );
    expect(migration).toContain(
      "or automation_next_due_at is null",
    );
  });

  it("creates an efficient due-task index", () => {
    expect(migration).toContain(
      "create index if not exists house_plan_tasks_automation_due_idx",
    );
    expect(migration).toContain("lifecycle_status = 'published'");
    expect(migration).toContain("automation_enabled = true");
    expect(migration).toContain("automation_paused_at is null");
  });

  it("creates the immutable transition journal", () => {
    expect(migration).toContain(
      "create table if not exists public.house_plan_status_transitions",
    );
    expect(migration).toContain("kind in ('automatic', 'manual')");
    expect(migration).toContain("from_status <> to_status");
    expect(migration).toContain("kind <> 'automatic' or due_at is not null");
    expect(migration).toContain("No UPDATE policy");
    expect(migration).toContain("No DELETE policy");
  });

  it("provides automatic transition idempotency", () => {
    expect(migration).toContain(
      "house_plan_status_transitions_auto_idempotency_uq",
    );
    expect(migration).toContain(
      "task_id,\n    from_status,\n    to_status,\n    due_at",
    );
    expect(migration).toContain("where kind = 'automatic'");
  });

  it("keeps the journal private from public users", () => {
    expect(migration).toContain(
      "alter table public.house_plan_status_transitions enable row level security",
    );
    expect(migration).toContain(
      "house_plan_status_transitions_admin_select",
    );
    expect(migration).toContain(
      "house_plan_status_transitions_admin_insert",
    );
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("public.is_authenticated_admin()");
    expect(migration).toContain("No anonymous/public policy");
  });

  it("uses forward-only idempotent migration guards", () => {
    expect(migration).toContain("add column if not exists");
    expect(migration).toContain("create table if not exists");
    expect(migration).toContain("create index if not exists");
    expect(migration).toContain("if not exists (");
    expect(migration).not.toMatch(
      /drop\s+(table|column)\s+(?!if\s+exists)/i,
    );
  });
});
