import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync(
  "src/modules/content-engine/v2/client/useAdminContentCommand.ts",
  "utf8",
);

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("S3-T3 STALE_CONTENT recovery", () => {
  it("exposes command error code to callers while retaining generic refresh", () => {
    expect(hook).toContain(
      "onError?: (error: string, code?: string) => void",
    );
    expect(hook).toContain(
      "options.onError?.(result.error, result.code)",
    );
    expect(hook).toContain('result.code === "STALE_CONTENT"');
    expect(hook).toContain("router.refresh()");
  });

  it("has an authoritative Plan stale-recovery helper", () => {
    expect(workspace).toContain(
      "async function recoverFromStaleContent(taskId: string)",
    );
    expect(workspace).toContain(
      "const authoritativePlan = await refreshAdminHousePlanSnapshot({ houseId })",
    );
    expect(workspace).toContain(
      "const authoritativeTasks = normalizePlanTasks(authoritativePlan)",
    );
    expect(workspace).toContain(
      "const authoritativeTask = authoritativeTasks.find((item) => item.id === taskId)",
    );
    expect(workspace).toContain("setTasks(authoritativeTasks)");
    expect(workspace).toContain("setDraft(authoritativeTask)");
  });

  it("clears unsaved file deltas after replacing stale draft", () => {
    const start = workspace.indexOf(
      "async function recoverFromStaleContent(taskId: string)",
    );
    const end = workspace.indexOf("const counters = useMemo", start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const block = workspace.slice(start, end);

    expect(block).toContain("setSelectedImageFiles([])");
    expect(block).toContain("setSelectedPdfFiles([])");
    expect(block).toContain("setRemovedImageIds([])");
    expect(block).toContain("setRemovedDocumentIds([])");
    expect(block).toContain("setPdfError(null)");
    expect(block).toContain("setPanelDirty(false)");
  });

  it("uses the same stale recovery for update/removeFiles/addFiles", () => {
    const submitStart = workspace.indexOf("async function submitTask");
    const submitEnd = workspace.indexOf(
      "const uploadImageDisabled",
      submitStart,
    );

    expect(submitStart).toBeGreaterThan(-1);
    expect(submitEnd).toBeGreaterThan(submitStart);

    const block = workspace.slice(submitStart, submitEnd);

    expect(block).toContain("const staleRecoveryOptions = {");
    expect(block).toContain('if (code === "STALE_CONTENT")');
    expect(block).toContain(
      "void recoverFromStaleContent(activeTaskId)",
    );

    expect(block).toContain('type: "plan.update"');
    expect(block).toContain('type: "plan.removeFiles"');
    expect(block).toContain('type: "plan.addFiles"');

    const optionUses =
      block.match(/staleRecoveryOptions/g)?.length ?? 0;

    expect(optionUses).toBeGreaterThanOrEqual(4);
  });

  it("does not auto-retry or restore blanket prop synchronization", () => {
    const submitStart = workspace.indexOf("async function submitTask");
    const submitEnd = workspace.indexOf(
      "const uploadImageDisabled",
      submitStart,
    );
    const block = workspace.slice(submitStart, submitEnd);

    const updateCommands =
      block.match(/type: "plan\.update"/g)?.length ?? 0;
    const removeCommands =
      block.match(/type: "plan\.removeFiles"/g)?.length ?? 0;
    const addCommands =
      block.match(/type: "plan\.addFiles"/g)?.length ?? 0;

    expect(updateCommands).toBe(1);
    expect(removeCommands).toBe(1);
    expect(addCommands).toBe(1);
    expect(block.toLowerCase()).not.toContain("retry");
    expect(block).not.toContain("while (");

    expect(workspace).not.toContain(
      "setTasks(normalizePlanTasks(plan))",
    );
  });
});
