import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("S3-T2 INTERNAL authoritative recovery", () => {
  it("has a dedicated INTERNAL recovery helper", () => {
    expect(workspace).toContain(
      "async function recoverFromInternalContent(taskId: string)",
    );
    expect(workspace).toContain(
      "const authoritativeTasks = await refreshAuthoritativeTasks()",
    );
    expect(workspace).toContain(
      "const authoritativeTask = authoritativeTasks.find((item) => item.id === taskId)",
    );
    expect(workspace).toContain("setDraft(authoritativeTask)");
  });

  it("clears pending attachment deltas after INTERNAL recovery", () => {
    const start = workspace.indexOf(
      "async function recoverFromInternalContent(taskId: string)",
    );
    const end = workspace.indexOf(
      "async function recoverFromStaleContent(taskId: string)",
      start,
    );

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

  it("routes INTERNAL from update/removeFiles/addFiles to authoritative recovery", () => {
    const start = workspace.indexOf("const contentRecoveryOptions = {");
    const end = workspace.indexOf('if (intent === "delete")', start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const options = workspace.slice(start, end);

    expect(options).toContain('if (code === "STALE_CONTENT")');
    expect(options).toContain('if (code === "INTERNAL")');
    expect(options).toContain(
      "void recoverFromStaleContent(activeTaskId)",
    );
    expect(options).toContain(
      "void recoverFromInternalContent(activeTaskId)",
    );

    const submitStart = workspace.indexOf("async function submitTask");
    const submitEnd = workspace.indexOf(
      "const uploadImageDisabled",
      submitStart,
    );
    const submit = workspace.slice(submitStart, submitEnd);

    expect(submit.match(/contentRecoveryOptions/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(4);
  });

  it("does not introduce command auto retry", () => {
    const submitStart = workspace.indexOf("async function submitTask");
    const submitEnd = workspace.indexOf(
      "const uploadImageDisabled",
      submitStart,
    );
    const block = workspace.slice(submitStart, submitEnd);

    expect(block.match(/type: "plan\.update"/g)?.length ?? 0).toBe(1);
    expect(block.match(/type: "plan\.removeFiles"/g)?.length ?? 0).toBe(1);
    expect(block.match(/type: "plan\.addFiles"/g)?.length ?? 0).toBe(1);
    expect(block.toLowerCase()).not.toContain("retry");
  });
});
