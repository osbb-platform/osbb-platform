import { timingSafeEqual } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

type AutomationTransitionDetail = {
  taskId: string;
  houseId: string;
  fromStatus: string;
  toStatus: string;
  dueAt: string;
  executedAt: string;
};

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expected || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const actual = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function parseBatchSize(request: Request): number {
  const rawValue = new URL(request.url).searchParams.get("batchSize");

  if (rawValue === null) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number(rawValue);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_BATCH_SIZE
  ) {
    throw new Error("INVALID_BATCH_SIZE");
  }

  return parsed;
}

function readTransitionDetails(value: unknown): AutomationTransitionDetail[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const details = (value as Record<string, unknown>).transitionDetails;

  if (!Array.isArray(details)) {
    return [];
  }

  return details.filter(
    (item): item is AutomationTransitionDetail => {
      if (!item || typeof item !== "object") return false;

      const row = item as Record<string, unknown>;

      return (
        typeof row.taskId === "string" &&
        typeof row.houseId === "string" &&
        typeof row.fromStatus === "string" &&
        typeof row.toStatus === "string" &&
        typeof row.dueAt === "string" &&
        typeof row.executedAt === "string"
      );
    },
  );
}

async function writeAutomaticHistory(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  transitions: AutomationTransitionDetail[],
) {
  if (transitions.length === 0) return;

  const rows = transitions.map((transition) => ({
    occurred_at: transition.executedAt,
    actor_admin_id: null,
    actor_name: "Автоматика плану",
    actor_email: null,
    actor_role: "system",
    house_id: transition.houseId,
    entity_type: "house_plan_task",
    entity_id: transition.taskId,
    action: "updated",
    description:
      `Автоматично змінено статус завдання: ` +
      `${transition.fromStatus} → ${transition.toStatus}.`,
    before_snapshot: null,
    after_snapshot: null,
    metadata: {
      subSectionKey: "plan",
      source: "plan_automation",
      automation: true,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      dueAt: transition.dueAt,
    },
    diff: null,
  }));

  const { error } = await supabase
    .from("house_content_history")
    .insert(rows);

  if (error) {
    console.error("P11 plan automation history write failed", {
      code: error.code,
      message: error.message,
      transitionCount: transitions.length,
    });
  }
}

async function revalidateAffectedPublicPlans(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  transitions: AutomationTransitionDetail[],
) {
  const houseIds = [
    ...new Set(transitions.map((transition) => transition.houseId)),
  ];

  if (houseIds.length === 0) return;

  const { data, error } = await supabase
    .from("houses")
    .select("id,slug")
    .in("id", houseIds);

  if (error) {
    console.error("P11 plan automation house lookup failed", {
      code: error.code,
      message: error.message,
      houseCount: houseIds.length,
    });
    return;
  }

  const slugs = new Set<string>();

  for (const house of data ?? []) {
    if (typeof house.slug === "string" && house.slug) {
      slugs.add(house.slug);
    }
  }

  for (const slug of slugs) {
    revalidatePath(`/house/${slug}/plan`);
  }
}

async function runAutomation(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  let batchSize: number;

  try {
    batchSize = parseBatchSize(request);
  } catch {
    return NextResponse.json(
      { ok: false, error: "INVALID_BATCH_SIZE" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "run_house_plan_automation",
    {
      p_batch_size: batchSize,
    },
  );

  if (error) {
    console.error("P05 plan automation executor failed", {
      code: error.code,
      message: error.message,
    });

    return NextResponse.json(
      { ok: false, error: "EXECUTOR_FAILED" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const transitions = readTransitionDetails(data);

  await writeAutomaticHistory(supabase, transitions);
  await revalidateAffectedPublicPlans(supabase, transitions);

  return NextResponse.json(
    {
      ok: true,
      result: data,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function GET(request: Request) {
  return runAutomation(request);
}

export async function POST(request: Request) {
  return runAutomation(request);
}
