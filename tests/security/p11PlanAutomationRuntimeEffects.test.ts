import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608190002_extend_plan_automation_executor_details.sql",
  "utf8",
);

const route = readFileSync(
  "app/api/internal/plan-automation/run/route.ts",
  "utf8",
);

const normalizedMigration = migration.replace(/\s+/g, " ").toLowerCase();

describe("P11 T7 plan automation runtime effects", () => {
  it("preserves the legacy executor summary and adds transition details", () => {
    expect(normalizedMigration).toContain("'processedtasks'");
    expect(normalizedMigration).toContain("'transitions'");
    expect(normalizedMigration).toContain("'archivedtasks'");
    expect(normalizedMigration).toContain("'executedat'");
    expect(normalizedMigration).toContain("'transitiondetails'");

    expect(normalizedMigration).toContain("'taskid'");
    expect(normalizedMigration).toContain("'houseid'");
    expect(normalizedMigration).toContain("'fromstatus'");
    expect(normalizedMigration).toContain("'tostatus'");
    expect(normalizedMigration).toContain("'dueat'");
  });

  it("keeps the executor security and concurrency boundary intact", () => {
    expect(normalizedMigration).toContain("security definer");
    expect(normalizedMigration).toContain(
      "set search_path = public, pg_temp",
    );
    expect(normalizedMigration).toContain("for update skip locked");
    expect(normalizedMigration).toContain(
      "from public, anon, authenticated",
    );
    expect(normalizedMigration).toContain("to service_role");
  });

  it("writes automatic lifecycle transitions to visible house history", () => {
    expect(route).toContain('.from("house_content_history")');
    expect(route).toContain('actor_name: "Автоматика плану"');
    expect(route).toContain('actor_admin_id: null');
    expect(route).toContain('entity_type: "house_plan_task"');
    expect(route).toContain('source: "plan_automation"');
    expect(route).toContain("fromStatus:");
    expect(route).toContain("toStatus:");
    expect(route).toContain("dueAt:");
  });

  it("keeps history persistence best-effort after a successful executor run", () => {
    expect(route).toContain(
      'console.error("P11 plan automation history write failed"',
    );
    expect(route).toContain(
      "await writeAutomaticHistory(supabase, transitions)",
    );
    expect(route).toContain(
      "await revalidateAffectedPublicPlans(supabase, transitions)",
    );
    expect(route).toContain("ok: true");
  });

  it("revalidates the public plan for each affected house slug", () => {
    expect(route).toContain('.from("houses")');
    expect(route).toContain('.select("id,slug")');
    expect(route).toContain('revalidatePath(`/house/${slug}/plan`)');
  });

  it("retains CRON_SECRET constant-time authorization", () => {
    expect(route).toContain("process.env.CRON_SECRET");
    expect(route).toContain("timingSafeEqual");
    expect(route).toContain("status: 401");
  });
});
