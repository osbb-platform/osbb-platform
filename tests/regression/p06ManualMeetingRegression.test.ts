import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("P06-T1 manual meeting regression", () => {
  const handler = read(
    "src/modules/content-engine/v2/handlers/meetings/handler.ts",
  );

  const types = read(
    "src/modules/content-engine/v2/handlers/meetings/types.ts",
  );

  const create = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/create.ts",
  );

  const publish = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/publish.ts",
  );

  const update = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/update.ts",
  );

  const recordManualVote = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/recordManualVote.ts",
  );

  const shared = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/shared.ts",
  );

  const openVoting = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/openVoting.ts",
  );

  const closeVoting = read(
    "src/modules/content-engine/v2/handlers/meetings/commands/closeVoting.ts",
  );

  it("keeps the required manual lifecycle commands registered", () => {
    expect(handler).toContain("create: createCommand");
    expect(handler).toContain("publish: publishCommand");
    expect(handler).toContain(
      "recordManualVote: recordManualVoteCommand",
    );

    expect(types).toContain(
      'HouseMeetingVotingMode = "manual" | "online"',
    );
  });

  it("creates manual meetings by default and persists manual mode", () => {
    expect(shared).toContain(
      'fallback: HouseMeetingVotingMode = "manual"',
    );
    expect(create).toContain(
      "const votingMode = normalizeVotingMode(payload.votingMode)",
    );
    expect(create).toContain("voting_mode: votingMode");
    expect(create).toContain(
      'manualVotes: votingMode === "manual" ? payload.manualVotes : undefined',
    );
  });

  it("publishes manual meetings into scheduled state", () => {
    expect(publish).toContain(
      'payload.status ?? "scheduled"',
    );
    expect(publish).toContain(
      'displayStatus === "draft" || displayStatus === "archived"',
    );
    expect(publish).toContain(
      '? "scheduled"',
    );
    expect(publish).toContain(
      "meeting_status: toMeetingStatus(nextDisplayStatus)",
    );
  });

  it("uses the normal meeting update lifecycle to open and close manual meetings", () => {
    expect(shared).toContain(
      'if (displayStatus === "scheduled") return "scheduled"',
    );
    expect(shared).toContain(
      'if (displayStatus === "active") return "in_progress"',
    );
    expect(shared).toContain(
      'displayStatus === "review"',
    );
    expect(shared).toContain(
      'return "closed"',
    );

    expect(update).toContain(
      "payload.status ?? before.meeting.display_status",
    );
    expect(update).toContain(
      "meeting_status: toMeetingStatus(displayStatus)",
    );
    expect(update).toContain(
      "voting_mode: votingMode",
    );
  });

  it("records manual votes only through the manual vote path", () => {
    expect(recordManualVote).toContain(
      'before.meeting.voting_mode !== "manual"',
    );
    expect(recordManualVote).toContain(
      '"record_house_meeting_manual_ballot"',
    );
    expect(recordManualVote).not.toContain(
      "const recordResult = await recordManualVotes",
    );
    expect(recordManualVote).not.toContain(
      "lock_version: payload.lockVersion + 1",
    );
    expect(recordManualVote).toContain(
      'action: "manual_vote.recorded"',
    );

    expect(shared).toContain(
      '"record_house_meeting_manual_vote"',
    );
    expect(shared).toContain(
      '.from("house_meeting_manual_votes")',
    );
    expect(shared).toContain(
      '"recalculate_house_meeting_question_counters"',
    );
  });

  it("keeps online open/close commands out of the manual lifecycle", () => {
    expect(openVoting).toContain(
      'before.voting_mode !== "online"',
    );
    expect(closeVoting).toContain(
      'before.voting_mode !== "online"',
    );

    expect(openVoting).toContain(
      'display_status: "active"',
    );
    expect(openVoting).toContain(
      'meeting_status: "in_progress"',
    );
    expect(closeVoting).toContain(
      'display_status: "review"',
    );
    expect(closeVoting).toContain(
      'meeting_status: "closed"',
    );
  });

  it("does not import or invoke Diia in the manual command path", () => {
    const manualPath = [
      handler,
      create,
      publish,
      update,
      recordManualVote,
      shared,
    ]
      .join("\n")
      .toLowerCase();

    expect(manualPath).not.toContain('from "@/src/modules/diia');
    expect(manualPath).not.toContain("mockdiiaprovider");
    expect(manualPath).not.toContain("officialdiiaprovider");
    expect(manualPath).not.toContain("initonlineballot");
    expect(manualPath).not.toContain("/api/diia");
  });
});
