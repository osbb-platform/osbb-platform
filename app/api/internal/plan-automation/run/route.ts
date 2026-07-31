import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

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
