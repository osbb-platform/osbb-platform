import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  "app/api/internal/plan-automation/run/route.ts",
  "utf8",
);
const normalized = route.replace(/\s+/g, " ").toLowerCase();

describe("P05 T6.2 protected cron route", () => {
  it("runs only in the Node runtime and remains dynamic", () => {
    expect(route).toContain('export const runtime = "nodejs"');
    expect(route).toContain('export const dynamic = "force-dynamic"');
  });

  it("requires CRON_SECRET bearer authorization", () => {
    expect(route).toContain("process.env.CRON_SECRET");
    expect(route).toContain('authorization?.startsWith("Bearer ")');
    expect(route).toContain("timingSafeEqual");
    expect(normalized).toContain('error: "unauthorized"');
    expect(route).toContain("status: 401");
  });

  it("does not leak secret or raw database errors", () => {
    expect(route).not.toContain("expected, actual");
    expect(route).not.toContain("error.details");
    expect(route).not.toContain("error.hint");
    expect(normalized).toContain('error: "executor_failed"');
  });

  it("validates the batch range", () => {
    expect(route).toContain("const DEFAULT_BATCH_SIZE = 100");
    expect(route).toContain("const MAX_BATCH_SIZE = 500");
    expect(route).toContain("Number.isInteger(parsed)");
    expect(route).toContain("parsed < 1");
    expect(route).toContain("parsed > MAX_BATCH_SIZE");
    expect(normalized).toContain('error: "invalid_batch_size"');
    expect(route).toContain("status: 400");
  });

  it("uses the service-role client and executor RPC", () => {
    expect(route).toContain(
      '"run_house_plan_automation"',
    );
    expect(route).toContain("p_batch_size: batchSize");
  });

  it("supports GET and POST for scheduler compatibility", () => {
    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function POST");
    expect(route).toContain("return runAutomation(request)");
  });

  it("disables response caching", () => {
    expect(
      route.match(/"Cache-Control": "no-store"/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });
});
