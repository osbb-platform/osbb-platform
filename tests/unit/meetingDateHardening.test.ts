import { describe, expect, it } from "vitest";
import { createCommand } from "@/src/modules/content-engine/v2/handlers/meetings/commands/create";
import { isValidMeetingDate } from "@/src/modules/content-engine/v2/handlers/meetings/commands/shared";
import type { HandlerContext } from "@/src/modules/content-engine/v2/types/pipeline";

const stubCtx = {} as HandlerContext;

const validBase = {
  title: "Загальні збори",
  questions: [{ question: "Питання 1" }],
};

describe("RC-4: meeting_date server-side sanity bound", () => {
  it("accepts a missing/empty date (nullable field)", () => {
    expect(isValidMeetingDate(undefined)).toBe(true);
    expect(isValidMeetingDate(null)).toBe(true);
    expect(isValidMeetingDate("")).toBe(true);
    expect(isValidMeetingDate("   ")).toBe(true);
  });

  it("accepts ordinary real-world dates, past and future", () => {
    expect(isValidMeetingDate("2026-09-15T18:00")).toBe(true);
    expect(isValidMeetingDate("2020-01-01T00:00")).toBe(true);
    expect(isValidMeetingDate("2099-12-31T23:59")).toBe(true);
    expect(isValidMeetingDate(new Date().toISOString())).toBe(true);
  });

  it("rejects a malformed/unparseable date string", () => {
    expect(isValidMeetingDate("not-a-date")).toBe(false);
    expect(isValidMeetingDate("2026-13-45T99:99")).toBe(false);
  });

  it("rejects an absurd year (e.g. the reported year-61015 case)", () => {
    expect(isValidMeetingDate("61015-01-01T00:00")).toBe(false);
    expect(isValidMeetingDate("0001-01-01T00:00")).toBe(false);
  });

  it("create.validate rejects an absurd meeting date with a user-facing message", async () => {
    const result = await createCommand.validate!(
      { ...validBase, meetingDateTime: "61015-01-01T00:00" },
      stubCtx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("дата");
    }
  });

  it("create.validate accepts a normal meeting date", async () => {
    const result = await createCommand.validate!(
      { ...validBase, meetingDateTime: "2026-10-01T18:00" },
      stubCtx,
    );
    expect(result.ok).toBe(true);
  });
});
