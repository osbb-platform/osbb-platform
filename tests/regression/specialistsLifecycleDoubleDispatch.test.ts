import { describe, expect, it } from "vitest";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/modules/houses/components/HouseSpecialistsWorkspace.tsx",
  "utf8",
);

describe("specialists lifecycle double-dispatch regression", () => {
  it("guards lifecycle dispatch synchronously with a ref", () => {
    expect(source).toContain("const lifecycleCommandPendingRef = useRef(false);");
    expect(source).toContain("if (lifecycleCommandPendingRef.current) return;");
    expect(source).toContain("lifecycleCommandPendingRef.current = true;");
    expect(source).toContain("lifecycleCommandPendingRef.current = false;");
  });

  it("passes pending state to every lifecycle confirmation modal", () => {
    const lifecycleModalBlocks = source
      .split("<PlatformConfirmModal")
      .slice(1)
      .filter((block) =>
        ['confirmAction === "delete"', 'confirmAction === "publish"', 'confirmAction === "archive"', 'confirmAction === "restore"']
          .some((marker) => block.includes(marker)),
      );

    expect(lifecycleModalBlocks).toHaveLength(4);
    for (const block of lifecycleModalBlocks) {
      expect(block).toContain("isPending={isPending}");
    }
  });
});
