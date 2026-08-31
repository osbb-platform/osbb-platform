import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

function submitTaskBlock() {
  const start = workspace.indexOf("async function submitTask");
  const end = workspace.indexOf(
    "const uploadImageDisabled",
    start,
  );

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return workspace.slice(start, end);
}

function editSaveBlock() {
  const block = submitTaskBlock();
  const start = block.indexOf('const updated = await dispatch({');
  const end = block.indexOf("resetWorkspace();", start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);

  return block.slice(start, end + "resetWorkspace();".length);
}

describe("S3-T2 plan attachment/save reliability regression", () => {
  it("existing task: upload -> save -> authoritative reopen state", () => {
    const block = editSaveBlock();

    expect(block).toContain('type: "plan.update"');
    expect(block).toContain("const updateUploadedFiles = await uploadSelectedFiles(activeTaskId)");
    expect(block).toContain('type: "plan.addFiles"');
    expect(block).toContain("await refreshAuthoritativeTasks();");

    const addIndex = block.indexOf('type: "plan.addFiles"');
    const refreshIndex = block.indexOf("await refreshAuthoritativeTasks();");

    expect(addIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(addIndex);
  });

  it("second file append preserves existing attachments by reading authoritative state", () => {
    const block = editSaveBlock();

    expect(block).toContain("uploadSelectedFiles(activeTaskId)");
    expect(block).toContain('type: "plan.addFiles"');
    expect(block).toContain("files: updateUploadedFiles");
    expect(block).toContain("await refreshAuthoritativeTasks();");

    expect(block).not.toContain("setTasks((prev) =>");
    expect(block).not.toContain("...draft,");
  });

  it("remove-only save executes registry removal before authoritative refresh", () => {
    const block = editSaveBlock();

    expect(block).toContain("if (fieldKeysToRemove.length > 0)");
    expect(block).toContain('type: "plan.removeFiles"');
    expect(block).toContain("fieldKeys: fieldKeysToRemove");
    expect(block).toContain("await refreshAuthoritativeTasks();");

    const removeIndex = block.indexOf('type: "plan.removeFiles"');
    const refreshIndex = block.indexOf("await refreshAuthoritativeTasks();");

    expect(removeIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(removeIndex);
  });

  it("remove + add runs update -> remove -> upload/add -> authoritative refresh", () => {
    const block = editSaveBlock();

    const updateIndex = block.indexOf('type: "plan.update"');
    const removeIndex = block.indexOf('type: "plan.removeFiles"');
    const uploadIndex = block.indexOf(
      "const updateUploadedFiles = await uploadSelectedFiles(activeTaskId)",
    );
    const addIndex = block.indexOf('type: "plan.addFiles"');
    const refreshIndex = block.indexOf("await refreshAuthoritativeTasks();");

    expect(updateIndex).toBeGreaterThan(-1);
    expect(removeIndex).toBeGreaterThan(updateIndex);
    expect(uploadIndex).toBeGreaterThan(removeIndex);
    expect(addIndex).toBeGreaterThan(uploadIndex);
    expect(refreshIndex).toBeGreaterThan(addIndex);
  });

  it("double-save boundary closes/reset workspace after authoritative refresh", () => {
    const block = editSaveBlock();

    const refreshIndex = block.indexOf("await refreshAuthoritativeTasks();");
    const resetIndex = block.indexOf("resetWorkspace();");

    expect(refreshIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(refreshIndex);

    expect(workspace).toContain(
      'disabled={isPending}',
    );
    expect(workspace).toContain(
      'onClick={() => void submitTask("save")}',
    );
  });

  it("create with files also finishes from the server snapshot instead of optimistic draft", () => {
    const block = submitTaskBlock();

    const createModeIndex = block.indexOf('if (workspaceMode === "create")');
    const createCommandIndex = block.indexOf('type: "plan.create"', createModeIndex);
    const refreshIndex = block.indexOf(
      "await refreshAuthoritativeTasks();",
      createCommandIndex,
    );
    const resetIndex = block.indexOf("resetWorkspace();", refreshIndex);

    expect(createModeIndex).toBeGreaterThan(-1);
    expect(createCommandIndex).toBeGreaterThan(createModeIndex);
    expect(refreshIndex).toBeGreaterThan(createCommandIndex);
    expect(resetIndex).toBeGreaterThan(refreshIndex);

    const createBlock = block.slice(createModeIndex, resetIndex);

    expect(createBlock).toContain("files: uploadedFiles");
    expect(createBlock).not.toContain("setTasks((prev) => [");
  });

  it("command failure after upload never advances local task state as if save succeeded", () => {
    const block = editSaveBlock();

    expect(block).toContain("if (!updated) return;");
    expect(block).toContain("if (!removed) return;");
    expect(block).toContain("if (!added) return;");
    expect(block).toContain("if (!updateUploadedFiles) {");
    expect(block).toContain("return;");

    const failureBoundary = block.indexOf("if (!added) return;");
    const refreshIndex = block.indexOf("await refreshAuthoritativeTasks();");

    expect(failureBoundary).toBeGreaterThan(-1);
    expect(refreshIndex).toBeGreaterThan(failureBoundary);
  });
});
