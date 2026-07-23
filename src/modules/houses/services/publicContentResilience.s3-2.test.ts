import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const serviceRoot = path.join(
  process.cwd(),
  "src/modules/houses/services",
);

const contracts = [
  ["getPublishedHouseInformationPosts.ts", "published-house-information-posts-v2"],
  ["getPublishedHouseMeetings.ts", "published-house-meetings-v2"],
  ["getPublishedHouseSpecialists.ts", "published-house-specialists-v2"],
  ["getPublishedHouseFaq.ts", "published-house-faq-v2"],
  ["getPublishedHouseBoard.ts", "published-house-board-v2"],
  ["getPublishedHouseDebtors.ts", "published-house-debtors-v2"],
  ["getPublishedHousePlan.ts", "published-house-plan-v2"],
  ["getPublishedHouseHomeWidgets.ts", "published-house-home-widgets-v2"],
  ["getPublicHouseBellFeed.ts", "public-house-bell-feed-v2"],
  ["getPublicHouseDocumentsFeed.ts", "public-house-documents-feed-v2"],
  ["getPublishedHouseHero.ts", "published-house-hero-v2"],
  ["getPublishedHouseRequisites.ts", "published-house-requisites-v2"],
] as const;

function read(file: string) {
  return fs.readFileSync(
    path.join(serviceRoot, file),
    "utf8",
  );
}

describe("public content resilience S3.2", () => {
  it("uses one shared resilience implementation", () => {
    const helper = read("publicContentResilience.ts");

    expect(helper).toContain("PUBLIC_CONTENT_READ_FAILED");
    expect(helper).toContain("PUBLIC_CONTENT_OPTIONAL_READ_FAILED");
    expect(helper).toContain("throw new Error(");
  });

  for (const [file, cacheKey] of contracts) {
    it(`${file} uses resilient required reads and a fresh cache key`, () => {
      const source = read(file);

      expect(source).toContain("throwRequiredPublicReadError");
      expect(source).toContain(cacheKey);
    });
  }

  it("keeps optional secondary resources non-fatal", () => {
    expect(
      read("getPublishedHouseInformationPosts.ts"),
    ).toContain("logOptionalPublicReadError");

    expect(
      read("getPublishedHouseSpecialists.ts"),
    ).toContain("logOptionalPublicReadError");

    expect(
      read("getPublishedHouseBoard.ts"),
    ).toContain("logOptionalPublicReadError");

    expect(
      read("getPublishedHousePlan.ts"),
    ).toContain("logOptionalPublicReadError");
  });

  it("protects the separate chairman cache", () => {
    expect(
      read("getPublishedHouseBoard.ts"),
    ).toContain("public-house-chairman-v2");
  });
});
