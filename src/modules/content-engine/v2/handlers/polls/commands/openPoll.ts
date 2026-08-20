import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePoll, OpenPollPayload } from "../types";
import {
  getPoll,
  HOUSE_POLL_ENTITY_TYPE,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
} from "./shared";

export const openPollCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const result = readIdAndLock(rawPayload);
    return result.ok ? ok(undefined) : result;
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as OpenPollPayload;
    const beforeResult = await getPoll(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (
      before.lifecycle_status !== "published" ||
      before.poll_status !== "idle"
    ) {
      return err(
        "Відкрити можна лише опубліковане неактивне опитування.",
        "VALIDATION_FAILED",
      );
    }

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .update({
        poll_status: "active",
        updated_at: new Date().toISOString(),
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .eq("lifecycle_status", "published")
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
        action: "poll.opened",
        description: `Відкрито опитування «${poll.title}».`,
        beforeSnapshot: before,
        afterSnapshot: poll,
        metadata: pollsHistoryMetadata({ pollStatus: poll.poll_status }),
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
