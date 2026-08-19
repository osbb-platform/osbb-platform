import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("P06 T3 meeting command contracts", () => {
  it("adds manual|online votingMode to meeting contracts", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/types.ts",
    );

    expect(source).toContain(
      'HouseMeetingVotingMode = "manual" | "online"',
    );
    expect(source).toContain(
      "voting_mode: HouseMeetingVotingMode",
    );
    expect(source).toContain(
      "votingMode?: HouseMeetingVotingMode",
    );
  });

  it("persists voting mode on create and update", () => {
    const create = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/create.ts",
    );
    const update = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/update.ts",
    );

    expect(create).toContain("voting_mode: votingMode");
    expect(update).toContain("voting_mode: votingMode");
    expect(update).toContain("meetingHasAnyVotes");
    expect(update).toContain(
      "Тип голосування не можна змінити після появи голосів.",
    );
  });

  it("does not permit manual vote payload in online meetings", () => {
    const create = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/create.ts",
    );
    const update = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/update.ts",
    );

    for (const source of [create, update]) {
      expect(source).toContain(
        'votingMode === "online"',
      );
      expect(source).toContain(
        "Ручні голоси не можна додавати до онлайн-зборів.",
      );
    }
  });

  it("rejects recordManualVote for online mode", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/recordManualVote.ts",
    );

    expect(source).toContain(
      'before.meeting.voting_mode !== "manual"',
    );
    expect(source).toContain(
      '"VALIDATION_FAILED"',
    );
  });

  it("registers explicit openVoting and closeVoting commands", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/handler.ts",
    );

    expect(source).toContain(
      "openVoting: openVotingCommand",
    );
    expect(source).toContain(
      "closeVoting: closeVotingCommand",
    );
  });

  it("opens only scheduled online meetings using actual status mapping", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/openVoting.ts",
    );

    expect(source).toContain(
      'before.voting_mode !== "online"',
    );
    expect(source).toContain(
      'before.display_status !== "scheduled"',
    );
    expect(source).toContain(
      'display_status: "active"',
    );
    expect(source).toContain(
      'meeting_status: "in_progress"',
    );
  });

  it("closes only active online meetings using actual status mapping", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/closeVoting.ts",
    );

    expect(source).toContain(
      'before.display_status !== "active"',
    );
    expect(source).toContain(
      'before.meeting_status !== "in_progress"',
    );
    expect(source).toContain(
      'display_status: "review"',
    );
    expect(source).toContain(
      'meeting_status: "closed"',
    );
  });

  it("checks both manual and online records before a mode change", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/shared.ts",
    );

    expect(source).toContain(
      '.from("house_meeting_manual_votes")',
    );
    expect(source).toContain(
      '.from("house_meeting_online_ballots")',
    );
  });

  it("does not import legacy voting runtime", () => {
    for (const file of [
      "src/modules/content-engine/v2/handlers/meetings/commands/openVoting.ts",
      "src/modules/content-engine/v2/handlers/meetings/commands/closeVoting.ts",
      "src/modules/content-engine/v2/handlers/meetings/commands/create.ts",
      "src/modules/content-engine/v2/handlers/meetings/commands/update.ts",
      "src/modules/content-engine/v2/handlers/meetings/commands/recordManualVote.ts",
    ]) {
      expect(read(file)).not.toContain("legacy-v1");
    }
  });
});
