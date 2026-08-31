import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const servicePath =
  "src/modules/content-engine/v2/services/taskService.ts";
const service = readFileSync(servicePath, "utf8");

function handlerSources(): Array<{ path: string; source: string }> {
  const root = "src/modules/content-engine/v2/handlers";
  const result: Array<{ path: string; source: string }> = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        result.push({ path: full, source: readFileSync(full, "utf8") });
      }
    }
  }

  walk(root);
  return result;
}

const handlers = handlerSources();

describe("S1-T5 generic Command Bus draft-task routing", () => {
  it("routes ensureDraftTask through the generic atomic RPC", () => {
    expect(service).toContain('"ensure_draft_approval_task"');
    expect(service).toContain("p_house_id: ctx.house.id");
    expect(service).toContain("p_entity_type: entityType");
    expect(service).toContain("p_entity_id: entityId");
    expect(service).toContain("p_title: title");
  });

  it("has no runtime plan-only RPC special case", () => {
    expect(service).not.toContain(
      '"ensure_house_plan_draft_approval_task"',
    );
    expect(service).not.toContain(
      'if (entityType === "house_plan_task")',
    );
  });

  it("does not recreate the four-record ensure path with separate client inserts", () => {
    const rpcIndex = service.indexOf('"ensure_draft_approval_task"');
    expect(rpcIndex).toBeGreaterThanOrEqual(0);

    const ensureStart = service.lastIndexOf("ensureDraftTask", rpcIndex);
    const completeStart = service.indexOf("completeDraftTask", rpcIndex);

    expect(ensureStart).toBeGreaterThanOrEqual(0);
    expect(completeStart).toBeGreaterThan(rpcIndex);

    const ensureBody = service.slice(ensureStart, completeStart);

    expect(ensureBody).toContain('.rpc("ensure_draft_approval_task"');
    expect(ensureBody).not.toContain('.from("platform_tasks").insert');
    expect(ensureBody).not.toContain('.from("platform_task_houses").insert');
    expect(ensureBody).not.toContain('.from("platform_task_links").insert');
    expect(ensureBody).not.toContain('.from("platform_task_events").insert');
  });

  it("keeps every handler tasks.ensure declarative and routed through taskService", () => {
    const ensureHandlers = handlers.filter(({ source }) =>
      /tasks\s*:\s*\{[\s\S]*?ensure\s*:\s*\{/.test(source),
    );

    expect(ensureHandlers.length).toBeGreaterThan(0);

    for (const { path, source } of ensureHandlers) {
      expect(
        source,
        `${path} must not call the generic RPC directly`,
      ).not.toContain("ensure_draft_approval_task");

      expect(
        source,
        `${path} must not directly insert platform_tasks`,
      ).not.toMatch(
        /\.from\(\s*["']platform_tasks["']\s*\)\s*\.insert/,
      );
    }
  });

  it("keeps historical plan RPC only as migration history, not runtime", () => {
    const migrationSources = readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .map((name) =>
        readFileSync(join("supabase/migrations", name), "utf8"),
      )
      .join("\n");

    expect(migrationSources).toContain(
      "ensure_house_plan_draft_approval_task",
    );
    expect(service).not.toContain(
      "ensure_house_plan_draft_approval_task",
    );
  });
});
