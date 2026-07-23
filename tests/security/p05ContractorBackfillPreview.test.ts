import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607231430_add_plan_contractor_reference.sql",
  "utf8",
);
const preview = readFileSync(
  "scripts/p05/preview-contractor-backfill.sql",
  "utf8",
);

describe("P05 contractor backfill preview gate", () => {
  it("adds a nullable contractor reference without touching legacy text", () => {
    expect(migration).toContain(
      "add column if not exists contractor_id uuid null",
    );
    expect(migration).toContain(
      "references public.contractors(id)",
    );
    expect(migration).toContain("on delete restrict");
    expect(migration).toContain("not valid");
    expect(migration).toContain(
      "validate constraint house_plan_tasks_contractor_id_fkey",
    );
    expect(migration).not.toMatch(
      /update\s+public\.house_plan_tasks[\s\S]*set\s+contractor_id/i,
    );
    expect(migration).not.toMatch(
      /drop\s+column[\s\S]*contractor/i,
    );
  });

  it("keeps the compatibility index additive and nullable", () => {
    expect(migration).toContain(
      "create index if not exists house_plan_tasks_contractor_id_idx",
    );
    expect(migration).toContain("where contractor_id is not null");
    expect(migration).not.toMatch(/contractor_id\s+uuid\s+not null/i);
  });

  it("uses the same proven normalization rule for preview matching", () => {
    expect(preview).toContain(
      "public.normalize_contractor_name(hpt.contractor)",
    );
    expect(preview).toContain(
      "c.normalized_name = legacy.normalized_name",
    );
    expect(preview).toContain("c.city_id is null");
  });

  it("classifies exact, missing, inactive and ambiguous matches", () => {
    for (const decision of [
      "EXACT_ACTIVE",
      "EXACT_INACTIVE",
      "MISSING",
      "AMBIGUOUS",
    ]) {
      expect(preview).toContain(decision);
    }
    expect(preview).toContain("match_count");
    expect(preview).toContain("has_active_match");
    expect(preview).toContain("task_count");
    expect(preview).toContain("task_ids");
  });

  it("is SELECT-only and contains no mutation statement", () => {
    const executable = preview
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    expect(executable).not.toMatch(/\binsert\s+into\b/i);
    expect(executable).not.toMatch(/\bupdate\b/i);
    expect(executable).not.toMatch(/\bdelete\s+from\b/i);
    expect(executable).not.toMatch(/\balter\s+table\b/i);
    expect(executable).not.toMatch(/\bcreate\s+(table|function|view)\b/i);
    expect(executable).not.toMatch(/\bdrop\b/i);
  });

  it("exposes an explicit approval-blocking safety invariant", () => {
    expect(preview).toContain("unresolved_names");
    expect(preview).toContain("ambiguous_names");
    expect(preview).toContain(
      "backfill must not proceed while either count is non-zero",
    );
  });
});
