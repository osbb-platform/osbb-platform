import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/modules/content-engine/v2/client/useAdminContentCommand.ts",
  "utf8",
);

describe("admin command pending boundary", () => {
  it("does not include a route refresh in the mutation pending transition", () => {
    expect(source).not.toContain("useTransition");
    expect(source).not.toContain("startTransition(async");
    expect(source).toContain("setPendingCount");
  });

  it("settles pending state even when dispatch or callbacks throw", () => {
    expect(source).toMatch(/try \{[\s\S]*await dispatchAdminCommand[\s\S]*catch[\s\S]*finally \{/);
    expect(source).toMatch(/finally \{[\s\S]*setPendingCount/);
  });

  it("keeps refresh fire-and-forget after a successful mutation", () => {
    expect(source).toContain("router.refresh()");
    expect(source).not.toContain("await router.refresh()");
  });
});
