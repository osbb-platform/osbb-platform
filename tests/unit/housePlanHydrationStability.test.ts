import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("HousePlanWorkspace hydration stability", () => {
  it("does not create a random/time-based draft during initial render", () => {
    expect(workspace).not.toContain("useState<PlanTask>(createEmptyTask())");
    expect(workspace).toContain(
      'id: "00000000-0000-4000-8000-000000000000"',
    );
    expect(workspace).toContain('now: "1970-01-01T00:00:00.000Z"');
  });

  it("keeps real ids and timestamps for actual create actions", () => {
    expect(workspace).toContain(
      "function createEmptyTask(seed?: { id: string; now: string })",
    );
    expect(workspace).toContain("seed?.id ?? createTaskId()");
    expect(workspace).toContain("seed?.now ?? new Date().toISOString()");
    expect(workspace.match(/setDraft\(createEmptyTask\(\)\)/g)?.length).toBeGreaterThanOrEqual(1);
  });
});
