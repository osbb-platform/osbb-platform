import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("admin shared loader resilience", () => {
  it("keeps the houses query required while optional message reads settle independently", () => {
    const source = read("src/modules/houses/services/getAdminHouses.ts");

    expect(source).toContain("Promise.allSettled");
    expect(source).toContain("ADMIN_HOUSES_OPTIONAL_READ_FAILED");
    expect(source).toContain("Failed to load admin houses");
    expect(source).not.toContain("Failed to load house messages:");
  });

  it("does not turn city-scope database failures into an empty scope", () => {
    const source = read("src/modules/auth/services/getAdminCityScope.ts");
    const errorBlocks = source.match(/if \([^)]*Error\) \{[\s\S]*?\n    \}/g) ?? [];

    expect(errorBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of errorBlocks) {
      expect(block).toContain("throw new Error");
      expect(block).not.toContain("return null");
    }
  });

  it("maps a house loader exception to INTERNAL rather than NOT_FOUND", () => {
    const source = read("src/modules/content-engine/v2/context.ts");
    const houseCatch = source.match(
      /try \{\s*house = await getAdminHouseById[\s\S]*?\} catch \{[\s\S]*?\n  \}/,
    )?.[0];

    expect(houseCatch).toContain('"INTERNAL"');
    expect(houseCatch).not.toContain('"NOT_FOUND"');
  });
});
