import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("S3-T1 authoritative plan attachments", () => {
  it("uses a dedicated server read after successful plan saves", () => {
    expect(workspace).toContain(
      'import { refreshAdminHousePlanSnapshot } from "@/src/modules/houses/actions/refreshAdminHousePlanSnapshot"',
    );
    expect(workspace).toContain(
      "async function refreshAuthoritativeTasks()",
    );
    expect(workspace).toContain(
      "const authoritativePlan = await refreshAdminHousePlanSnapshot({ houseId })",
    );
    expect(workspace).toContain(
      "const authoritativeTasks = normalizePlanTasks(authoritativePlan)",
    );
    expect(workspace).toContain("setTasks(authoritativeTasks)");
  });

  it("refreshes authoritative task/file state after create and update command chains", () => {
    const refreshCalls =
      workspace.match(/await refreshAuthoritativeTasks\(\);/g)?.length ?? 0;

    expect(refreshCalls).toBeGreaterThanOrEqual(2);

    const createStart = workspace.indexOf('if (workspaceMode === "create")');
    const updateStart = workspace.indexOf('const updated = await dispatch(');
    const finalReset = workspace.lastIndexOf("resetWorkspace();");

    expect(createStart).toBeGreaterThan(-1);
    expect(updateStart).toBeGreaterThan(createStart);
    expect(finalReset).toBeGreaterThan(updateStart);

    const createBlock = workspace.slice(createStart, updateStart);
    const updateBlock = workspace.slice(updateStart, finalReset + 100);

    expect(createBlock).toContain("await refreshAuthoritativeTasks();");
    expect(updateBlock).toContain("await refreshAuthoritativeTasks();");
  });

  it("does not synchronize server props into local state through a blanket effect", () => {
    expect(workspace).not.toMatch(
      /useEffect\([\s\S]{0,500}setTasks\(normalizePlanTasks\(plan\)\)/,
    );
  });

  it("provides the authenticated server action that reuses the authoritative read model", () => {
    const action = readFileSync(
      "src/modules/houses/actions/refreshAdminHousePlanSnapshot.ts",
      "utf8",
    );

    expect(action).toContain('"use server"');
    expect(action).toContain(
      'import { getAdminHousePlan } from "@/src/modules/houses/services/getAdminHousePlan"',
    );
    expect(action).toContain("return getAdminHousePlan({");
    expect(action).toContain("houseId: params.houseId");
  });
});
