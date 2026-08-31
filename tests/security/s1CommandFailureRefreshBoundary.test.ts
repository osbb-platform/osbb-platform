import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync(
  "src/modules/content-engine/v2/client/useAdminContentCommand.ts",
  "utf8",
);
const pipeline = readFileSync(
  "src/modules/content-engine/v2/pipeline.ts",
  "utf8",
);

describe("S1-T7 command failure authoritative refresh boundary", () => {
  it("refreshes immediately for STALE_CONTENT and INTERNAL", () => {
    expect(hook).toContain('result.code === "STALE_CONTENT"');
    expect(hook).toContain('result.code === "INTERNAL"');
    expect(hook).toMatch(
      /result\.code === "STALE_CONTENT"[\s\S]{0,300}result\.code === "INTERNAL"[\s\S]{0,300}router\.refresh\(\)/,
    );
  });

  it("documents authoritative lock_version recovery and forbids blind retry", () => {
    expect(hook).toContain("including lock_version");
    expect(hook).toContain("Never blind-retry the same command payload here");

    const errorBranch =
      hook.match(/if \(!result\.ok\) \{[\s\S]*?resolve\(null\);[\s\S]*?return;/)?.[0] ??
      "";

    expect(errorBranch).not.toMatch(
      /dispatchAdminCommand\s*\(|void dispatch\s*\(/,
    );
  });

  it("does not require a second user click to refresh stale content", () => {
    expect(hook).not.toContain('label: "Оновити дані"');
    expect(hook).not.toMatch(/onClick:\s*\(\)\s*=>\s*router\.refresh\(\)/);
  });

  it("does not turn late task side-effect failure into command failure", () => {
    expect(pipeline).toContain(
      "Command pipeline task side effect failed after domain mutation",
    );
    expect(pipeline).not.toContain("if (!taskResult.ok) return taskResult");
  });

  it("does not turn late cache revalidation failure into INTERNAL after domain mutation", () => {
    expect(pipeline).toContain(
      "Command pipeline cache revalidate failed after domain mutation",
    );

    const revalidateBlock =
      pipeline.match(/try \{[\s\S]*?revalidateForCommand[\s\S]*?\} catch \(error\) \{[\s\S]*?\n  \}/)?.[0] ??
      "";

    expect(revalidateBlock).not.toContain(
      'return err("Не вдалося оновити кеш сторінок.", "INTERNAL")',
    );
  });

  it("keeps history handling out of T7 scope", () => {
    expect(pipeline).toContain("await writeHistory");
  });
});
