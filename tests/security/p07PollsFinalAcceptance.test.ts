import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

describe("P07 T8 final acceptance contracts", () => {
  const migration = read(
    "supabase/migrations/202608201405_p07_create_house_polls.sql",
  );
  const repository = read(
    "src/modules/houses/resident/pollsRepository.ts",
  );
  const action = read(
    "src/modules/houses/resident/submitPollAnswers.ts",
  );
  const policy = read(
    "src/shared/security/rateLimitPolicies.ts",
  );
  const adminHandler = read(
    "src/modules/content-engine/v2/handlers/polls/handler.ts",
  );
  const adminShared = read(
    "src/modules/content-engine/v2/handlers/polls/commands/shared.ts",
  );
  const exportService = read(
    "src/modules/houses/services/getAdminPollExport.ts",
  );
  const resultsModel = read(
    "src/modules/houses/services/pollResultsModel.ts",
  );
  const navigation = read(
    "src/modules/houses/components/PublicHouseNavigation.tsx",
  );
  const residentUi = read(
    "src/modules/houses/components/PublicHousePolls.tsx",
  );

  it("keeps participation as the atomic apartment anti-duplicate key", () => {
    expect(migration).toMatch(
      /primary key\s*\(\s*poll_id\s*,\s*apartment_id\s*\)/i,
    );

    const participationInsert = repository.indexOf(
      '.from("house_poll_participation")',
    );
    const answersInsert = repository.indexOf(
      '.from("house_poll_answers").insert(answerRows)',
    );

    expect(participationInsert).toBeGreaterThan(-1);
    expect(answersInsert).toBeGreaterThan(participationInsert);
    expect(repository).toContain("APARTMENT_ALREADY_ANSWERED");
    expect(repository).toContain("uniqueViolation");
  });

  it("preserves controlled anonymity at write, result and export boundaries", () => {
    expect(repository).toContain(
      'poll.identity_mode === "anonymous" ? null : params.apartmentId',
    );

    expect(exportService).toContain(
      'poll.identity_mode === "open"',
    );
    expect(resultsModel).toContain(
      'source.poll.identity_mode === "open"',
    );
    expect(resultsModel).toContain(
      'params.identityMode === "anonymous"',
    );

    expect(resultsModel).toContain(
      '["Питання", "Тип", "Відповідь"]',
    );
  });

  it("has no anon answer/participation read policies", () => {
    const lower = migration.toLowerCase();

    expect(lower).toContain(
      "alter table public.house_poll_answers enable row level security",
    );
    expect(lower).toContain(
      "alter table public.house_poll_participation enable row level security",
    );

    expect(lower).not.toMatch(
      /create\s+policy[^;]*?on\s+public\.house_poll_answers[^;]*?to\s+anon[^;]*?;/i,
    );
    expect(lower).not.toMatch(
      /create\s+policy[^;]*?on\s+public\.house_poll_participation[^;]*?to\s+anon[^;]*?;/i,
    );
  });

  it("wires pollSubmit through the resident session rate-limit boundary", () => {
    expect(policy).toContain("pollSubmit");
    expect(policy).toContain('scope: "poll_submit"');
    expect(action).toContain(
      "rateLimitPolicy: rateLimitPolicies.pollSubmit",
    );
    expect(action).toContain("retryAfterSeconds");
  });

  it("keeps lifecycle and post-participation identity settings server-enforced", () => {
    expect(adminHandler).toContain("replaceQuestions");
    expect(adminHandler).toContain("openPoll");
    expect(adminHandler).toContain("closePoll");

    const commandDir = path.join(
      process.cwd(),
      "src/modules/content-engine/v2/handlers/polls/commands",
    );
    const commandSources = fs
      .readdirSync(commandDir)
      .filter((name) => name.endsWith(".ts"))
      .map((name) =>
        fs.readFileSync(path.join(commandDir, name), "utf8"),
      )
      .join("\n");

    expect(commandSources).toContain("identity_mode");
    expect(commandSources).toContain("results_visibility");
    expect(adminShared).toMatch(
      /house_poll_participation|participation/i,
    );
  });

  it("keeps resident navigation and immutable-answer screens registered", () => {
    expect(navigation).toContain(
      '{ label: "Опитування", href: () => "/polls" }',
    );
    expect(residentUi).toContain(
      "Повторне редагування або відправлення недоступне",
    );
    expect(residentUi).toContain("result?.hasResponded === true");
    expect(residentUi).toContain("RESPOND_FIRST");
    expect(residentUi).toContain("UNTIL_COMPLETION");
    expect(residentUi).toContain("HIDDEN");
  });

  it("keeps P07 fully separate from Diia", () => {
    const p07Sources = [
      repository,
      action,
      adminHandler,
      adminShared,
      exportService,
      resultsModel,
      residentUi,
    ].join("\n").toLowerCase();

    expect(p07Sources).not.toContain("diia");
  });
});
