import { describe, expect, it } from "vitest";
import { compareHousePlanTasks } from "../../src/modules/houses/utils/sortHousePlanTasks";

function task(overrides: Partial<Parameters<typeof compareHousePlanTasks>[0]> = {}) {
  return {
    id: "task",
    taskStatus: "planned" as const,
    sortOrder: 10,
    updatedAt: "2026-08-01T10:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("S3-T6 plan completed sorting behavior", () => {
  it("completed tasks sort by completedAt DESC regardless of sortOrder", () => {
    const older = task({ id: "older", taskStatus: "completed", sortOrder: 0, completedAt: "2026-08-01T10:00:00.000Z" });
    const newer = task({ id: "newer", taskStatus: "completed", sortOrder: 999, completedAt: "2026-08-30T10:00:00.000Z" });
    expect([older, newer].sort(compareHousePlanTasks).map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("falls back to updatedAt DESC when completedAt is null", () => {
    const older = task({ id: "older", taskStatus: "completed", updatedAt: "2026-08-01T10:00:00.000Z" });
    const newer = task({ id: "newer", taskStatus: "completed", updatedAt: "2026-08-30T10:00:00.000Z" });
    expect([older, newer].sort(compareHousePlanTasks).map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("keeps planned/in-progress ordering separate", () => {
    const first = task({ id: "first", taskStatus: "planned", sortOrder: 1 });
    const second = task({ id: "second", taskStatus: "in_progress", sortOrder: 2, updatedAt: "2026-08-30T10:00:00.000Z" });
    expect([second, first].sort(compareHousePlanTasks).map((item) => item.id)).toEqual(["first", "second"]);
  });
});
