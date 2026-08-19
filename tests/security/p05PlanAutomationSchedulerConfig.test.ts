import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync("vercel.json", "utf8"),
) as {
  $schema?: string;
  crons?: Array<{
    path?: string;
    schedule?: string;
  }>;
};

const route = readFileSync(
  "app/api/internal/plan-automation/run/route.ts",
  "utf8",
);

describe("P05 T6.4 scheduler configuration", () => {
  it("uses the official Vercel configuration schema", () => {
    expect(config.$schema).toBe(
      "https://openapi.vercel.sh/vercel.json",
    );
  });

  it("registers exactly one plan automation cron", () => {
    expect(config.crons).toEqual([
      {
        path: "/api/internal/plan-automation/run",
        schedule: "10 0 * * *",
      },
    ]);
  });

  it("uses the supported daily fallback on Vercel Hobby", () => {
    const schedule = config.crons?.[0]?.schedule;

    expect(schedule).toBe("10 0 * * *");
    expect(schedule?.split(/\s+/u)).toHaveLength(5);
  });

  it("targets an existing protected GET route", () => {
    expect(route).toContain("export async function GET");
    expect(route).toContain("process.env.CRON_SECRET");
    expect(route).toContain('authorization?.startsWith("Bearer ")');
    expect(route).toContain('"run_house_plan_automation"');
  });

  it("keeps the scheduler route dynamic and uncached", () => {
    expect(route).toContain('export const dynamic = "force-dynamic"');
    expect(route).toContain('"Cache-Control": "no-store"');
  });
});
