import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const handler = read("src/modules/content-engine/v2/handlers/polls/handler.ts");
const create = read("src/modules/content-engine/v2/handlers/polls/commands/create.ts");
const update = read("src/modules/content-engine/v2/handlers/polls/commands/update.ts");
const replaceQuestions = read("src/modules/content-engine/v2/handlers/polls/commands/replaceQuestions.ts");
const publish = read("src/modules/content-engine/v2/handlers/polls/commands/publish.ts");
const openPoll = read("src/modules/content-engine/v2/handlers/polls/commands/openPoll.ts");
const closePoll = read("src/modules/content-engine/v2/handlers/polls/commands/closePoll.ts");
const archive = read("src/modules/content-engine/v2/handlers/polls/commands/archive.ts");
const restore = read("src/modules/content-engine/v2/handlers/polls/commands/restore.ts");
const workspace = read("src/modules/houses/components/HousePollsWorkspace.tsx");
const taskService = read("src/modules/content-engine/v2/services/taskService.ts");
const atomicMigration = read("supabase/migrations/202608311210_ensure_draft_approval_task_atomic.sql");
const uniqueMigration = read("supabase/migrations/202608311235_add_platform_task_draft_link_unique_index.sql");

describe("P07-T1 admin lifecycle after S1", () => {
  it("registers the full poll lifecycle command chain", () => {
    for (const command of [
      "create",
      "update",
      "replaceQuestions",
      "publish",
      "openPoll",
      "closePoll",
      "archive",
      "restore",
    ]) {
      expect(handler).toContain(`${command}:`);
    }
  });

  it("enforces draft -> published idle -> active -> completed -> archived -> restored completed", () => {
    expect(create).toContain('lifecycle_status: "draft"');
    expect(create).toContain('poll_status: "idle"');
    expect(publish).toContain('lifecycle_status: "published"');
    expect(publish).toContain('poll_status: "idle"');
    expect(openPoll).toContain('poll_status: "active"');
    expect(closePoll).toContain('poll_status: "completed"');
    expect(archive).toContain('lifecycle_status: "archived"');
    expect(archive).toContain('poll_status: "completed"');
    expect(restore).toContain('lifecycle_status: "published"');
    expect(restore).toContain('poll_status: "completed"');
  });

  it("allows question replacement only while the poll is an idle draft", () => {
    expect(replaceQuestions).toContain('before.poll.lifecycle_status !== "draft"');
    expect(replaceQuestions).toContain('before.poll.poll_status !== "idle"');
    expect(replaceQuestions).toContain("pollHasParticipation");
  });

  it("keeps optimistic locking on every mutable lifecycle transition", () => {
    for (const source of [update, replaceQuestions, publish, openPoll, closePoll, archive, restore]) {
      expect(source).toContain("requiresLockCheck: true");
      expect(source).toContain("lock_version");
    }
  });

  it("creates one draft approval task semantic and completes it on publish", () => {
    expect(create).toContain("tasks: {");
    expect(create).toContain("ensure: {");
    expect(create).toContain("entityType: HOUSE_POLL_ENTITY_TYPE");
    expect(create).not.toContain("complete:");

    expect(publish).toContain("tasks: {");
    expect(publish).toContain("complete: {");
    expect(publish).toContain("entityType: HOUSE_POLL_ENTITY_TYPE");
    expect(publish).not.toContain("ensure:");
  });

  it("routes ensureDraftTask only through the atomic S1 RPC and keeps unique draft-link index", () => {
    const ensureStart = taskService.indexOf("async function ensureDraftTask(");
    const ensureEnd = taskService.indexOf("async function completeDraftTask(", ensureStart);

    expect(ensureStart).toBeGreaterThan(-1);
    expect(ensureEnd).toBeGreaterThan(ensureStart);

    const ensureBody = taskService.slice(ensureStart, ensureEnd);
    expect(ensureBody).toContain('.rpc("ensure_draft_approval_task"');
    expect(ensureBody).not.toContain('.from("platform_task_links")');
    expect(ensureBody).not.toContain(".insert(");

    expect(atomicMigration).toContain("create or replace function public.ensure_draft_approval_task");
    expect(atomicMigration).toContain("'house_poll'");

    expect(uniqueMigration).toContain("create unique index if not exists platform_task_links_draft_uq");
    expect(uniqueMigration).toContain("on public.platform_task_links(link_type, entity_type, entity_id)");
    expect(uniqueMigration).toContain("where link_type='draft'");
  });

  it("admin UI exposes publish/open/close/archive/restore lifecycle actions", () => {
    expect(workspace).toContain('type: "polls.publish"');
    expect(workspace).toContain('command: "openPoll" | "closePoll" | "archive" | "restore" | "delete"');
    expect(workspace).toContain('runLifecycle("openPoll")');
    expect(workspace).toContain('runLifecycle("closePoll")');
    expect(workspace).toContain('runLifecycle("archive")');
    expect(workspace).toContain('runLifecycle("restore")');
  });
});
