import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("P05 T5.2b-3 automation actions UI", () => {
  it("dispatches dedicated pause and resume commands", () => {
    expect(workspace).toContain(
      'action: "pauseAutomation" | "resumeAutomation"',
    );
    expect(workspace).toContain("type: `plan.${action}`");
    expect(workspace).toContain(
      'runAutomationAction("pauseAutomation")',
    );
    expect(workspace).toContain(
      'runAutomationAction("resumeAutomation")',
    );
  });

  it("renders pause and resume controls for published automation", () => {
    expect(workspace).toContain(
      'data-p05-automation-action-controls="true"',
    );
    expect(workspace).toContain('draft.status !== "draft"');
    expect(workspace).toContain('draft.status !== "archived"');
    expect(workspace).toContain("Призупинити автоматизацію");
    expect(workspace).toContain("Відновити автоматизацію");
  });

  it("uses the atomic manual status command", () => {
    expect(workspace).toContain('type: "plan.transitionStatus"');
    expect(workspace).toContain("toStatus: draft.status");
    expect(workspace).toContain(
      'data-p05-manual-status-action="true"',
    );
    expect(workspace).toContain("Застосувати статус");
  });

  it("explains journal and interval reset", () => {
    expect(workspace).not.toContain(
      "Після збереження статус оновиться в CMS",
    );
    expect(workspace).toContain("Перехід буде записано в журнал");
    expect(workspace).toContain(
      "автоматичний інтервал почнеться заново",
    );
  });

  it("updates lock and schedule state from command results", () => {
    expect(workspace).toContain(
      "function applyAutomationCommandResult",
    );
    expect(workspace).toContain("record.automation_paused_at");
    expect(workspace).toContain("record.automation_anchor_at");
    expect(workspace).toContain("record.automation_next_due_at");
    expect(workspace).toContain(
      "getResultLockVersion(result, task.lockVersion + 1)",
    );
  });

  it("provides pending labels for all actions", () => {
    expect(workspace).toContain(
      "Призупиняємо автоматизацію...",
    );
    expect(workspace).toContain(
      "Відновлюємо автоматизацію...",
    );
    expect(workspace).toContain("Змінюємо статус завдання...");
    expect(workspace).toContain("Застосовуємо статус...");
  });
});
