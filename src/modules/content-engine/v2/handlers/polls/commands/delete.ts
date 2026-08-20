import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DeletePollPayload, HousePoll } from "../types";
import {
  getPoll,
  HOUSE_POLL_ENTITY_TYPE,
  pollsHistoryMetadata,
  publicPollPaths,
  readIdAndLock,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const result = readIdAndLock(rawPayload);
    return result.ok ? ok(undefined) : result;
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as DeletePollPayload;
    const beforeResult = await getPoll(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (
      before.lifecycle_status !== "draft" &&
      before.lifecycle_status !== "archived"
    ) {
      return err(
        "Видалити можна лише чернетку або архівне опитування.",
        "VALIDATION_FAILED",
      );
    }

    const { data, error } = await ctx.supabase
      .from("house_polls")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) return err(error.message, "INTERNAL");
    if (!data) {
      return err(
        "Опитування не знайдено або дані застаріли, оновіть сторінку.",
        "STALE_CONTENT",
      );
    }

    const poll = data as HousePoll;

    return ok({
      data: poll,
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: poll.id,
        action: "deleted",
        description: `Видалено опитування «${poll.title}».`,
        beforeSnapshot: before,
        metadata: pollsHistoryMetadata(),
      },
      tasks: {
        delete: {
          entityType: HOUSE_POLL_ENTITY_TYPE,
          entityId: poll.id,
        },
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
