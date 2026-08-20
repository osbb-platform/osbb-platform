import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { ArchivePollPayload, HousePoll } from "../types";
import {
  getPoll,
  HOUSE_POLL_ENTITY_TYPE,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
} from "./shared";

export const archiveCommand: CommandSpec = {
  actionKey: "archive",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const result = readIdAndLock(rawPayload);
    return result.ok ? ok(undefined) : result;
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ArchivePollPayload;
    const beforeResult = await getPoll(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (
      before.lifecycle_status !== "published" ||
      before.poll_status !== "completed"
    ) {
      return err(
        "Архівувати можна лише завершене опитування.",
        "VALIDATION_FAILED",
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .update({
        lifecycle_status: "archived",
        poll_status: "completed",
        archived_at: before.archived_at ?? now,
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .eq("lifecycle_status", "published")
      .eq("poll_status", "completed")
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
        action: "archived",
        description: `Архівовано опитування «${poll.title}».`,
        beforeSnapshot: before,
        afterSnapshot: poll,
        metadata: pollsHistoryMetadata(),
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
