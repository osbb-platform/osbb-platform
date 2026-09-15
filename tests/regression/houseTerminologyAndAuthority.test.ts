import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("house terminology and canonical server authority", () => {
  it("passes objectKind explicitly when formatting non-participants", () => {
    const source = read("src/modules/houses/components/HouseMeetingsWorkspace.tsx");
    expect(source).toContain(
      ".map((apartment) => formatApartmentVoteLabel(apartment, objectKind))",
    );
    expect(source).not.toContain(".map(formatApartmentVoteLabel)");
  });

  it("does not trust footer formData objectKind", () => {
    const source = read("src/modules/houses/actions/createFooterHouseMessage.ts");
    expect(source).not.toContain('formData.get("objectKind")');
    expect(source).toContain('.select("id, object_kind")');
    expect(source).toContain('.eq("id", houseId)');
    expect(source).toContain('.eq("slug", houseSlug)');
    expect(source).toContain("canonicalHouse.object_kind");
  });
});
