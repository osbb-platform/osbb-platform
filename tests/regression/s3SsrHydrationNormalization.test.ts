import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const meetings = readFileSync(
  "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
  "utf8",
);
const polls = readFileSync(
  "src/modules/houses/components/HousePollsWorkspace.tsx",
  "utf8",
);
const plan = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);
const adminDate = readFileSync(
  "src/shared/utils/format/formatAdminDate.ts",
  "utf8",
);

describe("S3-T4 SSR hydration normalization", () => {
  it("provides one Kyiv datetime formatter", () => {
    const formatter = readFileSync(
      "src/shared/utils/dates/formatKyivDateTime.ts",
      "utf8",
    );

    expect(formatter).toContain('const KYIV_TIME_ZONE = "Europe/Kyiv"');
    expect(formatter).toContain('Intl.DateTimeFormat("uk-UA"');
    expect(formatter).toContain("timeZone: KYIV_TIME_ZONE");
  });

  it("Meetings/Polls/Plan use the shared Kyiv formatter for SSR-visible datetime", () => {
    for (const source of [meetings, polls, plan]) {
      expect(source).toContain("formatKyivDateTime");
    }

    expect(meetings).not.toContain('date.toLocaleString("uk-UA")');
    expect(polls).not.toContain('new Intl.DateTimeFormat("uk-UA"');
    expect(plan).not.toContain('.toLocaleString("uk-UA")');
  });

  it("shared admin formatter explicitly pins Europe/Kyiv", () => {
    expect(adminDate).toContain('timeZone: "Europe/Kyiv"');
  });

  it("Meetings initial draft seed is deterministic across server/client hydration", () => {
    expect(meetings).toContain(
      'const INITIAL_MEETING_ID = "meeting-00000000-0000-4000-8000-000000000000"',
    );
    expect(meetings).toContain(
      'const INITIAL_MEETING_NOW = "1970-01-01T00:00:00.000Z"',
    );
    expect(meetings).toContain("useState<MeetingItem>(() =>");
    expect(meetings).toContain("createEmptyMeeting({");
    expect(meetings).toContain("id: INITIAL_MEETING_ID");
    expect(meetings).toContain("now: INITIAL_MEETING_NOW");
  });

  it("Polls initial draft/question/option IDs are deterministic across hydration", () => {
    expect(polls).toContain(
      'const INITIAL_POLL_ID = "poll-00000000-0000-4000-8000-000000000000"',
    );
    expect(polls).toContain(
      "useState<PollDraft>(() => createEmptyPoll({ deterministic: true }))",
    );
    expect(polls).toContain('createClientId("question", {');
    expect(polls).toContain('createClientId("option", options)');
    expect(polls).toContain("deterministic,");
  });

  it("Plan keeps its already deterministic initial empty draft seed", () => {
    expect(plan).toContain(
      'id: "00000000-0000-4000-8000-000000000000"',
    );
    expect(plan).toContain(
      'now: "1970-01-01T00:00:00.000Z"',
    );
  });
});
