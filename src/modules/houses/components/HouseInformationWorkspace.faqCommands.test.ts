import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/modules/houses/components/HouseInformationWorkspace.tsx",
  "utf8",
);

describe("HouseInformationWorkspace FAQ quick actions", () => {
  it("uses literal FAQ command types only", () => {
    expect(source).toContain('type: "faq.publish"');
    expect(source).toContain('type: "faq.archive" as const');
    expect(source).toContain('type: "faq.delete" as const');
    expect(source).not.toContain('type: `faq.${action}`');
  });

  it("keeps the existing FAQ payload contract", () => {
    expect(source).toContain("faqId: faq.id");
    expect(source).toContain("lockVersion: faq.lockVersion");
  });
});
