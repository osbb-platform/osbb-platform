import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("P05 T5.2a plan automation UI", () => {
  it("renders automation controls", () => {
    expect(workspace).toContain('data-p05-automation-panel="true"');
    expect(workspace).toContain("Автоматичне виконання за етапами");
    expect(workspace).toContain("Увімкнути");
  });

  it("constrains intervals to 1..365 integers", () => {
    expect(workspace).toContain('type="number"');
    expect(workspace).toContain("min={1}");
    expect(workspace).toContain("max={365}");
    expect(workspace).toContain("step={1}");
    expect(workspace).toContain("Number.isInteger(parsed)");
  });

  it("uses seven days as default", () => {
    expect(workspace).toContain("prev.automationIntervalDays ?? 7");
    expect(workspace).toContain(
      "value={draft.automationIntervalDays ?? 7}",
    );
  });

  it("shows schedule states", () => {
    expect(workspace).toContain("draft.automationPausedAt");
    expect(workspace).toContain("draft.automationNextDueAt");
    expect(workspace).toContain("Розклад буде створено після публікації");
    expect(workspace).toContain("Наступний автоматичний перехід");
    expect(workspace).toContain("Автоматизацію призупинено");
  });

  it("explains the supported daily scheduler delay", () => {
    expect(workspace).toContain(
      "Перехід виконується під час найближчого щоденного запуску після настання строку",
    );
  });

  it("keeps full schedule state", () => {
    expect(workspace).toContain("automationPausedAt: string | null");
    expect(workspace).toContain("automationAnchorAt: string | null");
    expect(workspace).toContain("automationNextDueAt: string | null");
    expect(workspace).toContain(
      "automationPausedAt: task.content.automationPausedAt",
    );
  });
});
