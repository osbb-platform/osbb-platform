import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
  "utf8",
);

describe("manual meeting conflict lifecycle", () => {
  it("does not refresh before adopting the authoritative manual-ballot lock version", () => {
    const ballotBlock = source.match(
      /type: "meetings\.recordManualVote"[\s\S]{0,5000}?setSnapshotConflict\(false\)/,
    )?.[0] ?? "";

    expect(ballotBlock).toContain("refreshOnSuccess: false");
    expect(ballotBlock).toContain("recordedMeeting?.lock_version");
    expect(ballotBlock).toContain("setPanelDirty(false)");
  });

  it("rebases a clean open draft and preserves a dirty draft on a changed server lock", () => {
    expect(source).toContain("snapshotConflict");
    expect(source).toContain("if (panelDirty)");
    expect(source).toContain("setSnapshotConflict(true)");
    expect(source).toContain("setDraft(authoritativeMeeting)");
  });

  it("offers an explicit authoritative reload instead of retrying a stale write", () => {
    expect(source).toContain("reloadAuthoritativeMeeting");
    expect(source).toContain("Завантажити серверну версію");
    expect(source).not.toMatch(/STALE_CONTENT[\s\S]{0,300}dispatch\(/);
  });
});
