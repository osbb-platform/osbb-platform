import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const command = readFileSync(
  "src/modules/content-engine/v2/handlers/plan/commands/transitionStatus.ts",
  "utf8",
);

const actionsUi = readFileSync(
  "tests/unit/p05PlanAutomationActionsUi.test.ts",
  "utf8",
);

const commandsMigration = readFileSync(
  "supabase/migrations/202607231700_add_plan_automation_commands.sql",
  "utf8",
);

const normalizedMigration = commandsMigration
  .replace(/\s+/g, " ")
  .toLowerCase();

describe("P11 T8 manual transition closure", () => {
  it("has no dead application-side interval reset", () => {
    expect(command).not.toContain("resetPlanAutomationInterval");
    expect(command).toContain(
      'import { isPlanAutomationStatus } from "../automationLifecycle";',
    );
  });

  it("delegates manual status transition to the authoritative RPC", () => {
    expect(command).toContain(
      'ctx.supabase.rpc("transition_house_plan_status_manual"',
    );
    expect(command).toContain("p_house_id:ctx.house.id");
    expect(command).toContain("p_task_id:payload.id");
    expect(command).toContain("p_lock_version:payload.lockVersion");
    expect(command).toContain("p_to_status:payload.toStatus");
  });

  it("keeps the manual status action exposed in the existing UI contract", () => {
    expect(actionsUi).toContain("plan.transitionStatus");
    expect(actionsUi).toContain("data-p05-manual-status-action");
    expect(actionsUi).toContain("Застосувати статус");
  });

  it("keeps immutable manual journal persistence in SQL", () => {
    expect(normalizedMigration).toContain(
      "insert into public.house_plan_status_transitions",
    );
    expect(normalizedMigration).toContain("'manual'");
    expect(normalizedMigration).toContain("actor_admin_id");
    expect(normalizedMigration).toContain("auth.uid()");
  });

  it("keeps manual schedule reset authoritative in the SQL RPC", () => {
    expect(normalizedMigration).toContain(
      "automation_anchor_at=case when automation_enabled and automation_interval_days is not null then v_now else null end",
    );
    expect(normalizedMigration).toContain(
      "automation_next_due_at=case when automation_enabled and automation_interval_days is not null then v_now+make_interval(days=>automation_interval_days) else null end",
    );
  });
});
