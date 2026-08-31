import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function allMigrations(): string {
  return readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join("supabase/migrations", name), "utf8"))
    .join("\n\n");
}

const migrations = allMigrations();

describe("S1-T4 draft-link unique idempotency index", () => {
  it("RED: defines the required partial unique index", () => {
    expect(migrations).toContain(
      "create unique index if not exists platform_task_links_draft_uq",
    );
    expect(migrations).toContain(
      "on public.platform_task_links(link_type, entity_type, entity_id)",
    );
    expect(migrations).toContain("where link_type='draft'");
  });

  it("RED: keeps draft-approval RPC retry/concurrency safe", () => {
    expect(migrations).toContain("ensure_draft_approval_task");
    expect(migrations).toMatch(
      /pg_advisory_xact_lock|on conflict|unique_violation/i,
    );
  });
});
