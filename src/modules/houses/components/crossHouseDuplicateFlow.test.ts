import { describe, expect, it } from "vitest";
import { buildDuplicatePublishCommand, readDuplicateCreatedItem } from "./crossHouseDuplicateFlow";

describe("cross-house duplicate immediate publish", () => {
  const item = { targetHouseId: "house-2", targetHouseName: "House 2", createdId: "entity-2", lockVersion: 1 };

  it("reads the fresh duplicate result", () => {
    expect(readDuplicateCreatedItem({ created: [item] }, "house-2")).toEqual(item);
  });

  it("keeps the nested information post publish payload", () => {
    expect(buildDuplicatePublishCommand("information_posts.duplicate", item)).toEqual({
      type: "information_posts.publish",
      houseId: "house-2",
      payload: { data: { id: "entity-2", lockVersion: 1 } },
    });
  });

  it("keeps faqId for FAQ publish", () => {
    expect(buildDuplicatePublishCommand("faq.duplicate", item)).toEqual({
      type: "faq.publish",
      houseId: "house-2",
      payload: { faqId: "entity-2", lockVersion: 1 },
    });
  });

  it("does not guess an unsupported publish contract", () => {
    expect(buildDuplicatePublishCommand("meetings.duplicate", item)).toBeNull();
  });
});
