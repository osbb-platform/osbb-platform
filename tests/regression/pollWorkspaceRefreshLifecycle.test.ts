import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/modules/houses/components/HousePollsWorkspace.tsx",
  "utf8",
);

describe("poll workspace refresh lifecycle", () => {
  it("resynchronizes list state from the authoritative server snapshot", () => {
    expect(source).toContain("const [items, setItems] = useState(snapshot.items)");
    expect(source).toMatch(/useEffect\(\(\) => \{\s*setItems\(snapshot\.items\)/);
  });

  it("never hard reloads for save or lifecycle commands", () => {
    expect(source).not.toContain("window.location.reload");
    expect(source).not.toContain("function refreshPage");
  });

  it("uses one final refresh for compound save and publish", () => {
    expect(source).toContain("refreshOnSuccess: false");
    expect(source).toContain("router.refresh()");
  });

  it("clears only the validation entry for the field being edited", () => {
    expect(source).toContain("clearFieldValidation");
    expect(source).not.toMatch(/useEffect\(\(\) => \{\s*setActionError\(null\);\s*setInvalidFields\(new Set\(\)\);\s*\}, \[draft\]\)/);
  });
});
