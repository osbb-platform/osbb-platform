import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
  "src/modules/houses/components/HousePollsWorkspace.tsx",
  "utf8",
);
const adminPage = readFileSync(
  "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
  "utf8",
);
const tabs = readFileSync(
  "src/modules/houses/components/HouseSectionTabs.tsx",
  "utf8",
);
const service = readFileSync(
  "src/modules/houses/services/getAdminHousePolls.ts",
  "utf8",
);

describe("P07 T6 admin polls UI contract", () => {
  it("registers polls in the actual house workspace", () => {
    expect(tabs).toContain('{ value: "polls", label: "Опитування" }');
    expect(adminPage).toContain('"polls"');
    expect(adminPage).toContain("getAdminHousePolls");
    expect(adminPage).toContain("<HousePollsWorkspace");
    expect(adminPage).toContain("access.houseWorkspaces.polls.publish");
  });

  it("implements all five question types and scale 5/10", () => {
    for (const type of [
      "single_choice",
      "multiple_choice",
      "yes_no",
      "scale",
      "free_text",
    ]) {
      expect(workspace).toContain(`"${type}"`);
    }
    expect(workspace).toContain('<option value="5">1–5</option>');
    expect(workspace).toContain('<option value="10">1–10</option>');
    expect(workspace).toContain("scaleMinLabel");
    expect(workspace).toContain("scaleMaxLabel");
  });

  it("exposes identity and result visibility settings", () => {
    expect(workspace).toContain('value="open"');
    expect(workspace).toContain('value="anonymous"');
    expect(workspace).toContain('value="immediate"');
    expect(workspace).toContain('value="after_completion"');
    expect(workspace).toContain('value="hidden"');
    expect(workspace).toContain("settingsFrozen");
  });

  it("uses the complete admin command surface required by T6", () => {
    for (const command of [
      "polls.create",
      "polls.update",
      "polls.replaceQuestions",
      "polls.publish",
      "openPoll",
      "closePoll",
      "archive",
      "restore",
      "delete",
      "polls.deleteAllArchived",
    ]) {
      expect(workspace).toContain(command);
    }
  });

  it("renders T5 results and CSV export", () => {
    expect(service).toContain("getPollResults");
    expect(service).toContain("getAdminPollExport");
    expect(workspace).toContain("PollResultsPanel");
    expect(workspace).toContain("Експорт CSV");
    expect(workspace).toContain("Анонімний режим");
  });

  it("keeps T6 isolated from Diia and resident UI", () => {
    expect(workspace.toLowerCase()).not.toContain("diia");
    expect(workspace).not.toContain("PublicHouseNavigation");
    expect(workspace).not.toContain("submitPollAnswers");
  });
});
