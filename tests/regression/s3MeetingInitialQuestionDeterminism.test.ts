import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
  "utf8",
);

describe("S3-T4 meeting initial nested hydration determinism", () => {
  it("supports deterministic initial question ids", () => {
    expect(source).toContain("options?: { deterministic?: boolean }");
    expect(source).toContain(
      '"question-00000000-0000-4000-8000-000000000000"',
    );
    expect(source).toContain(': createId("question")');
  });

  it("uses deterministic nested id only for seeded initial meeting", () => {
    expect(source).toContain(
      "createQuestion(0, { deterministic: Boolean(seed) })",
    );
    expect(source).toContain("createQuestion(prev.questions.length)");
  });

  it("keeps outer initial seed deterministic", () => {
    expect(source).toContain(
      'const INITIAL_MEETING_ID = "meeting-00000000-0000-4000-8000-000000000000"',
    );
    expect(source).toContain(
      'const INITIAL_MEETING_NOW = "1970-01-01T00:00:00.000Z"',
    );
  });
});
