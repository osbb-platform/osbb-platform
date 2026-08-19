import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { publishCommand } from "../../src/modules/content-engine/v2/handlers/plan/commands/publish";
import { updateCommand } from "../../src/modules/content-engine/v2/handlers/plan/commands/update";
import type {
  HousePlanTask,
  UpdatePlanTaskPayload,
} from "../../src/modules/content-engine/v2/handlers/plan/types";
import type { HandlerContext } from "../../src/modules/content-engine/v2/types/pipeline";

const LOCAL_URL =
  process.env.API_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const LOCAL_SERVICE_KEY =
  process.env.SERVICE_ROLE_KEY ??
  process.env.SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasLocalIntegrationEnvironment =
  Boolean(LOCAL_URL) &&
  Boolean(LOCAL_SERVICE_KEY) &&
  (LOCAL_URL?.includes("127.0.0.1") === true ||
    LOCAL_URL?.includes("localhost") === true);

const supabase = createClient(
  LOCAL_URL ?? "http://127.0.0.1:54321",
  LOCAL_SERVICE_KEY ?? "p11-local-integration-disabled",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const runId = randomUUID().replaceAll("-", "").slice(0, 12);
const companySlug = `p11-t5-company-${runId}`;
const houseSlug = `p11-t5-house-${runId}`;

let companyId: string;
let houseId: string;

const fakeAdminId = randomUUID();

function millisecondsBetween(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function expectIntervalDays(
  dueAt: string | null,
  anchorAt: string | null,
  days: number,
) {
  expect(anchorAt).not.toBeNull();
  expect(dueAt).not.toBeNull();

  expect(
    millisecondsBetween(dueAt as string, anchorAt as string),
  ).toBe(days * 24 * 60 * 60 * 1000);
}

function context(): HandlerContext {
  return {
    supabase: supabase as SupabaseClient,
    command: {
      type: "plan.edit",
      payload: {},
      houseId,
    },
    user: {
      id: fakeAdminId,
      email: "p11-integration@example.test",
      fullName: "P11 integration",
      role: "admin",
    },
    house: {
      id: houseId,
      slug: houseSlug,
      name: "P11 T5 Integration House",
    },
  };
}

async function insertTask(params?: {
  lifecycleStatus?: "draft" | "published";
  taskStatus?: "planned" | "in_progress" | "completed";
  automationEnabled?: boolean;
  automationIntervalDays?: number | null;
  automationPausedAt?: string | null;
  automationAnchorAt?: string | null;
  automationNextDueAt?: string | null;
  publishedAt?: string | null;
  title?: string;
}) {
  const {
    lifecycleStatus = "published",
    taskStatus = "planned",
    automationEnabled = false,
    automationIntervalDays = null,
    automationPausedAt = null,
    automationAnchorAt = null,
    automationNextDueAt = null,
    publishedAt = lifecycleStatus === "published"
      ? "2026-08-01T00:00:00.000Z"
      : null,
    title = `P11 T5 ${randomUUID()}`,
  } = params ?? {};

  const { data, error } = await supabase
    .from("house_plan_tasks")
    .insert({
      house_id: houseId,
      title,
      description: "P11 integration fixture",
      date_mode: "deadline",
      deadline_at: "2026-12-31T00:00:00.000Z",
      task_status: taskStatus,
      priority: "medium",
      contractor: null,
      contractor_id: null,
      archive_year: null,
      sort_order: 0,
      lifecycle_status: lifecycleStatus,
      lock_version: 1,
      published_at: publishedAt,
      archived_at: null,
      created_by: null,
      automation_enabled: automationEnabled,
      automation_interval_days: automationIntervalDays,
      automation_paused_at: automationPausedAt,
      automation_anchor_at: automationAnchorAt,
      automation_next_due_at: automationNextDueAt,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to create P11 task fixture: ${error?.message ?? "no data"}`,
    );
  }

  return data as HousePlanTask;
}

function updatePayload(
  task: HousePlanTask,
  overrides?: Partial<UpdatePlanTaskPayload>,
): UpdatePlanTaskPayload {
  return {
    id: task.id,
    lockVersion: task.lock_version,
    title: task.title,
    description: task.description,
    dateMode: task.date_mode,
    deadlineAt: task.deadline_at,
    startDate: task.start_date,
    endDate: task.end_date,
    taskStatus: task.task_status,
    priority: task.priority,
    contractor: task.contractor,
    contractorId: task.contractor_id,
    automationEnabled: task.automation_enabled,
    automationIntervalDays: task.automation_interval_days,
    archiveYear: task.archive_year,
    sortOrder: task.sort_order,
    files: [],
    ...overrides,
  };
}

async function executeUpdate(
  task: HousePlanTask,
  overrides?: Partial<UpdatePlanTaskPayload>,
) {
  const result = await updateCommand.execute(
    updatePayload(task, overrides),
    context(),
  );

  if (!result.ok) {
    throw new Error(`plan.update failed: ${result.error}`);
  }

  return result.data.data as HousePlanTask;
}

async function readTask(id: string) {
  const { data, error } = await supabase
    .from("house_plan_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to read P11 task: ${error?.message ?? "no data"}`,
    );
  }

  return data as HousePlanTask;
}

describe.runIf(hasLocalIntegrationEnvironment).sequential(
  "P11 plan automation database integration",
  () => {
  beforeAll(async () => {
    const company = await supabase
      .from("management_companies")
      .insert({
        slug: companySlug,
        name: "P11 T5 Integration Company",
      })
      .select("id")
      .single();

    if (company.error || !company.data) {
      throw new Error(
        `Unable to create management company fixture: ${
          company.error?.message ?? "no data"
        }`,
      );
    }

    companyId = String(company.data.id);

    const house = await supabase
      .from("houses")
      .insert({
        slug: houseSlug,
        name: "P11 T5 Integration House",
        address: "P11 integration fixture",
        management_company_id: companyId,
      })
      .select("id")
      .single();

    if (house.error || !house.data) {
      throw new Error(
        `Unable to create house fixture: ${house.error?.message ?? "no data"}`,
      );
    }

    houseId = String(house.data.id);
  });

  afterAll(async () => {
    if (houseId) {
      await supabase.from("houses").delete().eq("id", houseId);
    }

    if (companyId) {
      await supabase
        .from("management_companies")
        .delete()
        .eq("id", companyId);
    }
  });

  it("schedules enabled automation when a draft task is published", async () => {
    const draft = await insertTask({
      lifecycleStatus: "draft",
      automationEnabled: true,
      automationIntervalDays: 2,
      publishedAt: null,
    });

    expect(draft.automation_anchor_at).toBeNull();
    expect(draft.automation_next_due_at).toBeNull();

    const result = await publishCommand.execute(
      {
        id: draft.id,
        lockVersion: draft.lock_version,
      },
      context(),
    );

    if (!result.ok) {
      throw new Error(`plan.publish failed: ${result.error}`);
    }

    const published = result.data.data as HousePlanTask;

    expect(published.lifecycle_status).toBe("published");
    expect(published.automation_enabled).toBe(true);
    expect(published.automation_interval_days).toBe(2);
    expectIntervalDays(
      published.automation_next_due_at,
      published.automation_anchor_at,
      2,
    );

    expect(published.published_at).toBe(published.automation_anchor_at);
  });

  it("preserves the live schedule on an ordinary published edit", async () => {
    const anchor = "2026-08-10T00:00:00.000Z";
    const due = "2026-08-17T00:00:00.000Z";

    const task = await insertTask({
      automationEnabled: true,
      automationIntervalDays: 7,
      automationAnchorAt: anchor,
      automationNextDueAt: due,
    });

    const updated = await executeUpdate(task, {
      title: `${task.title} edited`,
    });

    expect(updated.title).toBe(`${task.title} edited`);
    expect(new Date(updated.automation_anchor_at as string).getTime()).toBe(
      new Date(anchor).getTime(),
    );
    expect(new Date(updated.automation_next_due_at as string).getTime()).toBe(
      new Date(due).getTime(),
    );
    expect(updated.automation_paused_at).toBeNull();
  });

  it("starts a full interval when automation is enabled on a published task", async () => {
    const task = await insertTask({
      automationEnabled: false,
      automationIntervalDays: null,
    });

    const updated = await executeUpdate(task, {
      automationEnabled: true,
      automationIntervalDays: 2,
    });

    expect(updated.automation_enabled).toBe(true);
    expect(updated.automation_interval_days).toBe(2);
    expect(updated.automation_paused_at).toBeNull();
    expectIntervalDays(
      updated.automation_next_due_at,
      updated.automation_anchor_at,
      2,
    );
  });

  it("starts a new full interval when interval length changes", async () => {
    const oldAnchor = "2026-07-01T00:00:00.000Z";
    const oldDue = "2026-07-08T00:00:00.000Z";

    const task = await insertTask({
      automationEnabled: true,
      automationIntervalDays: 7,
      automationAnchorAt: oldAnchor,
      automationNextDueAt: oldDue,
    });

    const updated = await executeUpdate(task, {
      automationEnabled: true,
      automationIntervalDays: 3,
    });

    expect(updated.automation_interval_days).toBe(3);
    expect(updated.automation_anchor_at).not.toBe(oldAnchor);
    expect(updated.automation_next_due_at).not.toBe(oldDue);
    expectIntervalDays(
      updated.automation_next_due_at,
      updated.automation_anchor_at,
      3,
    );
  });

  it("preserves pause across an ordinary edit", async () => {
    const pausedAt = "2026-08-12T08:30:00.000Z";

    const task = await insertTask({
      automationEnabled: true,
      automationIntervalDays: 5,
      automationPausedAt: pausedAt,
      automationAnchorAt: null,
      automationNextDueAt: null,
    });

    const updated = await executeUpdate(task, {
      title: `${task.title} while paused`,
    });

    expect(updated.automation_enabled).toBe(true);
    expect(new Date(updated.automation_paused_at as string).getTime()).toBe(
      new Date(pausedAt).getTime(),
    );
    expect(updated.automation_anchor_at).toBeNull();
    expect(updated.automation_next_due_at).toBeNull();
  });

  it("clears the entire schedule when automation is disabled", async () => {
    const task = await insertTask({
      automationEnabled: true,
      automationIntervalDays: 4,
      automationAnchorAt: "2026-08-01T00:00:00.000Z",
      automationNextDueAt: "2026-08-05T00:00:00.000Z",
    });

    const updated = await executeUpdate(task, {
      automationEnabled: false,
      automationIntervalDays: null,
    });

    expect(updated.automation_enabled).toBe(false);
    expect(updated.automation_interval_days).toBeNull();
    expect(updated.automation_paused_at).toBeNull();
    expect(updated.automation_anchor_at).toBeNull();
    expect(updated.automation_next_due_at).toBeNull();
  });

  it("repairs an enabled published task whose due date is missing", async () => {
    const task = await insertTask({
      automationEnabled: true,
      automationIntervalDays: 6,
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    });

    const updated = await executeUpdate(task);

    expect(updated.automation_enabled).toBe(true);
    expectIntervalDays(
      updated.automation_next_due_at,
      updated.automation_anchor_at,
      6,
    );
  });

  it("executes overdue lifecycle catch-up, journals transitions, and is idempotent", async () => {
    const task = await insertTask({
      taskStatus: "planned",
      automationEnabled: true,
      automationIntervalDays: 1,
      automationAnchorAt: "2026-01-01T00:00:00.000Z",
      automationNextDueAt: "2026-01-02T00:00:00.000Z",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });

    const executionPoint = "2026-01-05T12:00:00.000Z";

    const firstRun = await supabase.rpc("run_house_plan_automation", {
      p_now: executionPoint,
      p_batch_size: 100,
    });

    if (firstRun.error) {
      throw new Error(
        `run_house_plan_automation first call failed: ${firstRun.error.message}`,
      );
    }

    expect(firstRun.data).toMatchObject({
      processedTasks: 1,
      transitions: 3,
      archivedTasks: 1,
    });

    const afterFirstRun = await readTask(task.id);

    expect(afterFirstRun.task_status).toBe("archived");
    expect(afterFirstRun.automation_anchor_at).toBe(
      "2026-01-04T00:00:00+00:00",
    );
    expect(afterFirstRun.automation_next_due_at).toBeNull();

    const transitions = await supabase
      .from("house_plan_status_transitions")
      .select(
        "from_status,to_status,due_at,kind,actor_admin_id,configured_interval_days",
      )
      .eq("task_id", task.id)
      .order("due_at", { ascending: true });

    if (transitions.error) {
      throw new Error(
        `Unable to read automatic journal: ${transitions.error.message}`,
      );
    }

    expect(transitions.data).toHaveLength(3);
    expect(
      transitions.data?.map((row) => [
        row.from_status,
        row.to_status,
        row.kind,
      ]),
    ).toEqual([
      ["planned", "in_progress", "automatic"],
      ["in_progress", "completed", "automatic"],
      ["completed", "archived", "automatic"],
    ]);

    for (const row of transitions.data ?? []) {
      expect(row.actor_admin_id).toBeNull();
      expect(row.configured_interval_days).toBe(1);
      expect(row.due_at).not.toBeNull();
    }

    const secondRun = await supabase.rpc("run_house_plan_automation", {
      p_now: executionPoint,
      p_batch_size: 100,
    });

    if (secondRun.error) {
      throw new Error(
        `run_house_plan_automation second call failed: ${secondRun.error.message}`,
      );
    }

    expect(secondRun.data).toMatchObject({
      processedTasks: 0,
      transitions: 0,
      archivedTasks: 0,
    });

    const journalAfterRepeat = await supabase
      .from("house_plan_status_transitions")
      .select("id", { count: "exact" })
      .eq("task_id", task.id);

    if (journalAfterRepeat.error) {
      throw new Error(
        `Unable to verify idempotency: ${journalAfterRepeat.error.message}`,
      );
    }

    expect(journalAfterRepeat.count).toBe(3);
  });
  },
);
