import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const servicesRoot = path.join(
  process.cwd(),
  "src/modules/houses/services",
);

const cachedPublicLoaders = [
  "getPublicHouseBellFeed.ts",
  "getPublicHouseDocumentsFeed.ts",
  "getPublishedHouseAnnouncements.ts",
  "getPublishedHouseBoard.ts",
  "getPublishedHouseDebtors.ts",
  "getPublishedHouseFaq.ts",
  "getPublishedHouseHero.ts",
  "getPublishedHouseHomeWidgets.ts",
  "getPublishedHouseInformationPosts.ts",
  "getPublishedHouseMeetings.ts",
  "getPublishedHousePlan.ts",
  "getPublishedHouseReports.ts",
  "getPublishedHouseRequisites.ts",
  "getPublishedHouseSpecialists.ts",
] as const;

const uncachedDocumentLoaders = [
  "getPublicHouseFoundingDocuments.ts",
  "getPublicHouseInformationDocuments.ts",
] as const;

function read(file: string) {
  return fs.readFileSync(
    path.join(servicesRoot, file),
    "utf8",
  );
}

function extractErrorBlocks(source: string) {
  const blocks: string[] = [];
  const matcher =
    /if\s*\([^)]*(?:error|Error)[^)]*\)\s*\{/g;

  for (const match of source.matchAll(matcher)) {
    const start = match.index;

    if (start === undefined) {
      continue;
    }

    const braceStart = source.indexOf("{", start);
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;

    for (
      let index = braceStart;
      index < source.length;
      index += 1
    ) {
      const character = source[index];

      if (quote !== null) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (character === "\\") {
          escaped = true;
          continue;
        }

        if (character === quote) {
          quote = null;
        }

        continue;
      }

      if (
        character === "'" ||
        character === '"' ||
        character === "`"
      ) {
        quote = character;
        continue;
      }

      if (character === "{") {
        depth += 1;
      } else if (character === "}") {
        depth -= 1;

        if (depth === 0) {
          blocks.push(source.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return blocks;
}

describe("public content false-empty guard", () => {
  for (const file of cachedPublicLoaders) {
    it(`${file} does not cache technical failures as empty content`, () => {
      const source = read(file);

      expect(source).toContain("unstable_cache");

      for (const block of extractErrorBlocks(source)) {
        if (block.includes("logOptionalPublicReadError")) {
          continue;
        }

        expect(block).not.toMatch(
          /return\s+(?:\[\]|null|\{[\s\S]{0,240}?(?:\[\]|null))/,
        );
      }
    });
  }

  it("specialist category failure preserves the primary specialist list", () => {
    const source = read("getPublishedHouseSpecialists.ts");

    const optionalBlock = extractErrorBlocks(source).find(
      (block) =>
        block.includes("categoriesResult.error") &&
        block.includes("logOptionalPublicReadError"),
    );

    expect(optionalBlock).toBeDefined();
    expect(optionalBlock).toContain(
      "specialistsResult.data ?? []",
    );
    expect(optionalBlock).toContain("mapHouseSpecialist");
    expect(optionalBlock).toContain("categories: []");
    expect(optionalBlock).not.toContain(
      "specialists: []",
    );
  });

  for (const file of uncachedDocumentLoaders) {
    it(`${file} throws on both document and file-registry failures`, () => {
      const source = read(file);

      expect(
        source.match(/throwRequiredPublicReadError\(\{/g),
      ).toHaveLength(2);

      for (const block of extractErrorBlocks(source)) {
        expect(block).not.toContain("return []");
      }
    });
  }

  it("keeps the structured shared resilience logger", () => {
    const helper = read("publicContentResilience.ts");

    expect(helper).toContain("PUBLIC_CONTENT_READ_FAILED");
    expect(helper).toContain(
      "PUBLIC_CONTENT_OPTIONAL_READ_FAILED",
    );
  });
});
