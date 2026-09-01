import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("P06 T9 admin online voting UI", () => {
  it("keeps votingMode in the existing admin meeting snapshot", () => {
    const source = read(
      "src/modules/houses/services/getAdminHouseMeetings.ts",
    );

    expect(source).toContain(
      'votingMode: "manual" | "online"',
    );
    expect(source).toContain(
      "votingMode: meeting.voting_mode",
    );
  });

  it("loads admin online data only for online meetings", () => {
    const source = read(
      "src/modules/houses/services/getAdminHouseMeetings.ts",
    );

    expect(source).toContain(
      'if (item.votingMode !== "online")',
    );
    expect(source).toContain(
      "getAdminOnlineMeetingVoting",
    );
  });

  it("uses the T7 weighted aggregation in admin", () => {
    const source = read(
      "src/modules/houses/services/getAdminOnlineMeetingVoting.ts",
    );

    expect(source).toContain(
      "getOnlineMeetingAggregation",
    );
  });

  it("uses a privacy-minimized ballot projection", () => {
    const source = read(
      "src/modules/houses/services/getAdminOnlineMeetingVoting.ts",
    );

    expect(source).toContain(
      '"owned_area_m2"',
    );
    expect(source).toContain(
      '"verified_at"',
    );
    expect(source).not.toContain(
      '"identity_hmac"',
    );
    expect(source).not.toContain(
      '"provider_txn_id"',
    );
    expect(source).not.toContain(
      '"challenge"',
    );
  });

  it("defaults new meetings to manual mode", () => {
    const source = read(
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
    );

    expect(source).toContain(
      'votingMode: "manual"',
    );
  });

  it("persists votingMode through the existing create/update commands", () => {
    const source = read(
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
    );

    expect(source).toContain(
      "votingMode: next.votingMode",
    );
  });

  it("locks mode selection after any manual vote or online ballot", () => {
    const source = read(
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
    );

    expect(source).toContain(
      "(draft.manualVotes ?? []).length > 0",
    );
    expect(source).toContain(
      "draft.onlineBallots.length > 0",
    );
    expect(source).toContain(
      'onlineVotingProviderMode === "disabled"',
    );
  });

  it("keeps manual vote entry manual-only", () => {
    const source = read(
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
    );

    expect(source).toContain(
      'draft.votingMode === "manual"',
    );
    expect(source).toContain(
      'type: "meetings.recordManualVote"',
    );
  });

  it("never recalculates integer manual counters for online mode", () => {
    const source = read(
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
    );

    expect(source).toContain(
      'if (meeting.votingMode === "online")',
    );
    expect(source).toContain(
      "manualVotes: []",
    );
  });

  it("wires explicit online open and close commands", () => {
    const source = read(
      "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
    );

    expect(source).toContain(
      '"openVoting" | "closeVoting"',
    );
    expect(source).toContain(
      "meetings.${command}",
    );
    expect(source).toContain(
      "Відкрити голосування",
    );
    expect(source).toContain(
      "Закрити голосування",
    );
  });

  it("surfaces the apartments-without-area warning", () => {
    const source = read(
      "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
    );

    expect(source).toContain(
      "APARTMENTS_WITHOUT_AREA",
    );
    expect(source).toContain(
      "не мають заповненої площі",
    );
  });

  it("shows weighted online results and apartment participation", () => {
    const source = read(
      "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
    );

    expect(source).toContain(
      "aggregation.totalHouseAreaM2",
    );
    expect(source).toContain(
      "aggregation.confirmedAreaM2",
    );
    expect(source).toContain(
      "aggregation.participationPercent",
    );
    expect(source).toContain(
      "question.forAreaM2",
    );
    expect(source).toContain(
      "question.againstAreaM2",
    );
    expect(source).toContain(
      "question.abstainedAreaM2",
    );
    expect(source).toContain(
      "aggregation.apartments.map",
    );
  });

  it("shows privacy-safe ballot fields only", () => {
    const source = read(
      "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
    );

    expect(source).toContain(
      "ballot.apartmentLabel",
    );
    expect(source).toContain(
      "ballot.ownedAreaM2",
    );
    expect(source).toContain(
      "ballot.status",
    );
    expect(source).toContain(
      "ballot.verifiedAt ?? ballot.createdAt",
    );

    expect(source).not.toContain(
      "identityHmac",
    );
    expect(source).not.toContain(
      "providerTxn",
    );
    expect(source).not.toContain(
      "ownerName",
    );
  });

  it("does not import the legacy voting runtime", () => {
    for (const file of [
      "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
      "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
      "src/modules/houses/services/getAdminOnlineMeetingVoting.ts",
    ]) {
      expect(read(file)).not.toContain("legacy-v1");
    }
  });
});
