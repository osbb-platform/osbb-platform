import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const admin = readFileSync("src/modules/houses/services/getAdminHousePlan.ts", "utf8");
const published = readFileSync("src/modules/houses/services/getPublishedHousePlan.ts", "utf8");
const workspace = readFileSync("src/modules/houses/components/HousePlanWorkspace.tsx", "utf8");

describe("S3-T6 completed plan sorting", () => {
  it("maps completed_at into shared plan snapshot", () => {
    expect(admin).toContain("completedAt: string | null");
    expect(admin).toContain("completedAt: task.completed_at");
  });

  it("has shared completed comparator", () => {
    const util = readFileSync("src/modules/houses/utils/sortHousePlanTasks.ts", "utf8");
    expect(util).toContain("export function compareHousePlanTasks");
    expect(util).toContain('left.taskStatus === "completed"');
    expect(util).toContain("left.completedAt ?? left.updatedAt");
    expect(util).toContain("right.completedAt ?? right.updatedAt");
    expect(util).toContain("rightCompletedTime - leftCompletedTime");
  });

  it("admin and public both apply comparator", () => {
    expect(admin).toContain("compareHousePlanTasks");
    expect(published).toContain("compareHousePlanTasks");
  });

  it("workspace retains completedAt from authoritative snapshot", () => {
    expect(workspace).toContain("completedAt: string | null");
    expect(workspace).toContain("completedAt: task.content.completedAt");
  });

  it("admin active list enforces completed chronology after generic workspace sorting", () => {
    expect(workspace).toContain('if (activeTab === "active")');
    expect(workspace).toContain("enforceCompletedChronology");
    expect(workspace).toContain("taskStatus: task.status ===");
    expect(workspace).toContain('activeStageFilter === "all"');
  });
});
