import type { CommandSpec } from "../../../types/handler";
import { ok, err } from "../../../types/result";
import type { InformationPost } from "../types";
import { INFORMATION_POST_ENTITY_TYPE } from "./shared";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const { data: deleted, error } = await ctx.supabase
      .from("house_information_posts")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived")
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const posts = (deleted ?? []) as InformationPost[];
    const count = posts.length;

    return ok({
      data: { deletedCount: count },
      history: {
        entityType: "house_information_post",
        entityId: ctx.house.id,
        action: "bulk_deleted_archived",
        description: `Масово видалено архівні інформаційні матеріали: ${count}.`,
        beforeSnapshot: posts,
        metadata: {
          subSectionKey: "information_posts",
          deletedCount: count,
        },
      },
      filesToDelete: posts.map((post) => ({
        entityType: INFORMATION_POST_ENTITY_TYPE,
        entityId: post.id,
      })),
    });
  },
};
