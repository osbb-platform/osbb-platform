import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202608201405_p07_create_house_polls.sql",
);

const rawSql = fs.readFileSync(migrationPath, "utf8");
const sql = rawSql.replace(/--[^\n]*/g, "").toLowerCase();

describe("P07 polls migration contract", () => {
  it("creates five poll tables with RLS", () => {
    for (const table of [
      "house_polls",
      "house_poll_questions",
      "house_poll_options",
      "house_poll_participation",
      "house_poll_answers",
    ]) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("enforces one participation per poll and apartment", () => {
    expect(sql).toContain("primary key (poll_id, apartment_id)");
  });

  it("does not create a per-submit linking identifier", () => {
    expect(sql).not.toMatch(/\bsubmission_id\b/i);
  });

  it("does not grant anon direct access to answers or participation", () => {
    const policies = [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)]
      .map((match) => match[0]);

    for (const table of ["house_poll_answers", "house_poll_participation"]) {
      const relevant = policies.filter((policy) =>
        policy.includes(`on public.${table}`),
      );
      expect(
        relevant.some((policy) => /\bto\s+anon\b/i.test(policy)),
      ).toBe(false);
    }
  });
  it("grants explicit base privileges required before RLS", () => {
    expect(sql).toMatch(/grant\s+select[\s\S]*?public\.house_polls[\s\S]*?public\.house_poll_questions[\s\S]*?public\.house_poll_options[\s\S]*?to\s+anon/i);
    expect(sql).toMatch(/grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete[\s\S]*?public\.house_poll_participation[\s\S]*?public\.house_poll_answers[\s\S]*?to\s+authenticated/i);
    expect(sql).toMatch(/grant\s+select\s*,\s*insert\s*,\s*update\s*,\s*delete[\s\S]*?public\.house_poll_participation[\s\S]*?public\.house_poll_answers[\s\S]*?to\s+service_role/i);
  });
});
