import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { normalizePollQuestions } from "../../src/modules/content-engine/v2/handlers/polls/commands/shared";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("P07 polls admin handler", () => {
  it("registers polls in HandlerKey and central handler registry", () => {
    expect(read("src/modules/content-engine/v2/types/commands.ts")).toContain(
      '| "polls"',
    );
    expect(read("src/modules/content-engine/v2/handlers/index.ts")).toContain(
      'import { pollsHandler } from "./polls";',
    );
    expect(read("src/modules/content-engine/v2/handlers/index.ts")).toContain(
      "registerHandler(pollsHandler)",
    );
  });

  it("adds polls to the exact RBAC workspace matrix", () => {
    const types = read("src/shared/permissions/rbac.types.ts");
    const config = read("src/shared/permissions/rbac.config.ts");
    const resolve = read("src/shared/permissions/rbac.resolve.ts");

    expect(types).toContain('| "polls"');
    expect(config).toContain('"polls",');
    expect(resolve).toContain('"polls",');

    expect(config).toContain("contentManagerWorkspaces.polls = {");
    expect(config).toMatch(
      /contentManagerWorkspaces\.polls\s*=\s*\{[\s\S]*?view:\s*true,[\s\S]*?create:\s*true,[\s\S]*?edit:\s*true,[\s\S]*?publish:\s*false,[\s\S]*?archive:\s*false,[\s\S]*?restore:\s*false,[\s\S]*?\};/,
    );

    expect(config).toMatch(
      /houseWorkspaces:\s*\{[\s\S]*?polls:\s*\{[\s\S]*?publish:\s*true,[\s\S]*?archive:\s*true,[\s\S]*?restore:\s*true,[\s\S]*?delete:\s*true,[\s\S]*?\}/,
    );
  });

  it("exposes the exact T3 command surface", () => {
    const handler = read(
      "src/modules/content-engine/v2/handlers/polls/handler.ts",
    );

    for (const command of [
      "create",
      "update",
      "replaceQuestions",
      "publish",
      "archive",
      "restore",
      "delete",
      "deleteAllArchived",
      "openPoll",
      "closePoll",
    ]) {
      expect(handler).toContain(`${command}:`);
    }
  });

  it("validates all five question types and their shapes", () => {
    const result = normalizePollQuestions([
      {
        question: "Один варіант?",
        questionType: "single_choice",
        options: [{ label: "A" }, { label: "B" }],
      },
      {
        question: "Кілька варіантів?",
        questionType: "multiple_choice",
        options: [{ label: "A" }, { label: "B" }],
      },
      {
        question: "Так чи ні?",
        questionType: "yes_no",
      },
      {
        question: "Оцініть",
        questionType: "scale",
        scaleMax: 10,
        scaleMinLabel: "Погано",
        scaleMaxLabel: "Добре",
      },
      {
        question: "Коментар",
        questionType: "free_text",
        isRequired: false,
      },
    ]);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.map((item) => item.questionType)).toEqual([
        "single_choice",
        "multiple_choice",
        "yes_no",
        "scale",
        "free_text",
      ]);
    }

    expect(
      normalizePollQuestions([
        {
          question: "Choice",
          questionType: "single_choice",
          options: [{ label: "Only one" }],
        },
      ]).ok,
    ).toBe(false);

    expect(
      normalizePollQuestions([
        {
          question: "Scale",
          questionType: "scale",
          scaleMax: 7,
        },
      ]).ok,
    ).toBe(false);
  });

  it("freezes privacy/result settings after participation and questions outside draft", () => {
    const update = read(
      "src/modules/content-engine/v2/handlers/polls/commands/update.ts",
    );
    const replace = read(
      "src/modules/content-engine/v2/handlers/polls/commands/replaceQuestions.ts",
    );

    expect(update).toContain("pollHasParticipation");
    expect(update).toContain("не можна змінювати після першої відповіді");

    expect(replace).toContain('before.poll.lifecycle_status !== "draft"');
    expect(replace).toContain('before.poll.poll_status !== "idle"');
    expect(replace).toContain("pollHasParticipation");
  });

  it("implements published idle -> active -> completed lifecycle", () => {
    const openPoll = read(
      "src/modules/content-engine/v2/handlers/polls/commands/openPoll.ts",
    );
    const closePoll = read(
      "src/modules/content-engine/v2/handlers/polls/commands/closePoll.ts",
    );

    expect(openPoll).toContain('before.lifecycle_status !== "published"');
    expect(openPoll).toContain('before.poll_status !== "idle"');
    expect(openPoll).toContain('poll_status: "active"');

    expect(closePoll).toContain('before.lifecycle_status !== "published"');
    expect(closePoll).toContain('before.poll_status !== "active"');
    expect(closePoll).toContain('poll_status: "completed"');
  });
});
