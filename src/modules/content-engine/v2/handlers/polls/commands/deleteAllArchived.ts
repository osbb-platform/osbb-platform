import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HousePoll } from "../types";
import {
  HOUSE_POLL_ENTITY_TYPE,
  pollsHistoryMetadata,
  publicPollPaths,
} from "./shared";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const { data, error } = await ctx.supabase
      .from("house_polls")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived")
      .select("*");

    if (error) return err(error.message, "INTERNAL");

    const polls = (data ?? []) as HousePoll[];

    return ok({
      data: { deletedCount: polls.length },
      history: {
        entityType: HOUSE_POLL_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "bulk_deleted_archived",
        description: `Масово видалено архівні опитування: ${polls.length}.`,
        beforeSnapshot: polls,
        metadata: pollsHistoryMetadata({
          deletedCount: polls.length,
        }),
      },
      extraRevalidatePaths: publicPollPaths(ctx.house.slug),
    });
  },
};
