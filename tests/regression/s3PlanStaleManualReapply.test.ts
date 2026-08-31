import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("S3-T3 manual stale reapply", () => {
  it("keeps a local stale draft backup before authoritative replacement", () => {
    expect(workspace).toContain(
      "const [staleDraftBackup, setStaleDraftBackup] = useState<PlanTask | null>(null)",
    );
    expect(workspace).toContain("const localDraft = draft");
    expect(workspace).toContain("setStaleDraftBackup(localDraft)");
  });

  it("offers an explicit manual reapply action after stale refresh", () => {
    expect(workspace).toContain("function reapplyStaleDraft()");
    expect(workspace).toContain("Повторно застосувати мої зміни");
    expect(workspace).toContain("Серверна версія завдання була оновлена");
  });

  it("reapplies editable fields onto authoritative draft without restoring stale lock/files", () => {
    const start = workspace.indexOf("function reapplyStaleDraft()");
    const end = workspace.indexOf("const counters = useMemo", start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const block = workspace.slice(start, end);

    expect(block).toContain("...authoritativeDraft");
    expect(block).toContain("title: staleDraftBackup.title");
    expect(block).toContain("description: staleDraftBackup.description");
    expect(block).toContain("priority: staleDraftBackup.priority");
    expect(block).toContain("dateMode: staleDraftBackup.dateMode");
    expect(block).toContain("contractor: staleDraftBackup.contractor");
    expect(block).toContain("automationEnabled: staleDraftBackup.automationEnabled");

    expect(block).not.toContain("lockVersion: staleDraftBackup.lockVersion");
    expect(block).not.toContain("images: staleDraftBackup.images");
    expect(block).not.toContain("documents: staleDraftBackup.documents");
    expect(block).not.toContain("automationPausedAt: staleDraftBackup.automationPausedAt");
    expect(block).not.toContain("automationAnchorAt: staleDraftBackup.automationAnchorAt");
    expect(block).not.toContain("automationNextDueAt: staleDraftBackup.automationNextDueAt");
  });

  it("manual reapply marks the editor dirty but never dispatches automatically", () => {
    const start = workspace.indexOf("function reapplyStaleDraft()");
    const end = workspace.indexOf("const counters = useMemo", start);
    const block = workspace.slice(start, end);

    expect(block).toContain("setPanelDirty(true)");
    expect(block).toContain("setStaleDraftBackup(null)");
    expect(block).not.toContain("dispatch(");
    expect(block.toLowerCase()).not.toContain("retry");
  });

  it("clears stale backup when editor context is reset", () => {
    expect(workspace.match(/setStaleDraftBackup\(null\)/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(4);
  });
});
