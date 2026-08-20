import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePoll, PublishPollPayload } from "../types";
import {
  ensurePollHasQuestions,
  getPoll,
  HOUSE_POLL_ENTITY_TYPE,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
} from "./shared";

export const publishCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const result = readIdAndLock(rawPayload);
    return result.ok ? ok(undefined) : result;
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as PublishPollPayload;
    const beforeResult = await getPoll(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (before.lifecycle_status !== "draft" || before.poll_status !== "idle") {
      return err(
        "Опублікувати можна лише чернетку опитування.",
        "VALIDATION_FAILED",
      );
    }

    const questionsResult = await ensurePollHasQuestions(ctx, payload.id);
    if (!questionsResult.ok) return questionsResult;

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .update({
        lifecycle_status: "published",
        poll_status: "idle",
        published_at: before.published_at ?? now,
        archived_at: null,
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .eq("lifecycle_status", "draft")
      .eq("poll_status", "idle")
      .select("*")
      .maybeSingle();

    if (error) return err(error.message, "INTERNAL");
    if (!data) return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");

    const poll = data as HousePoll;

    return ok({
      data: poll,
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: poll.id,
        action: "published",
        description: `Опубліковано опитування «${poll.title}».`,
        beforeSnapshot: before,
        afterSnapshot: poll,
        metadata: pollsHistoryMetadata(),
      },
      tasks: {
        complete: {
          entityType: HOUSE_POLL_ENTITY_TYPE,
          entityId: poll.id,
        },
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
