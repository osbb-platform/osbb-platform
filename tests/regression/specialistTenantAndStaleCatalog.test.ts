import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("specialist tenant and stale catalog safety", () => {
  it("scopes category-link deletion to both specialist and house", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/specialists/commands/shared.ts",
    );
    const deleteBlock = source.match(
      /\.from\("house_specialist_categories"\)\s*\.delete\(\)[\s\S]{0,240}?;/,
    )?.[0] ?? "";
    expect(deleteBlock).toContain('.eq("specialist_id", params.specialistId)');
    expect(deleteBlock).toContain('.eq("house_id", params.houseId)');
  });

  it("only deletes catalog rows present in the client baseline", () => {
    const types = read("src/modules/content-engine/v2/handlers/specialists/types.ts");
    const command = read(
      "src/modules/content-engine/v2/handlers/specialists/commands/categoriesUpsert.ts",
    );
    expect(types).toContain("loadedCategoryIds?: string[]");
    expect(command).toContain("loadedCategoryIds");
    expect(command).toContain("loadedIds.has(id)");
  });
});
