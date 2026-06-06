import type { CommandSpec } from "../../../types/handler";
import { ok, err } from "../../../types/result";
import type { Announcement } from "../types";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const { data: deleted, error } = await ctx.supabase
      .from("house_announcements")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived")
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const announcements = (deleted ?? []) as Announcement[];
    const count = announcements.length;

    return ok({
      data: { deletedCount: count },
      history: {
        entityType: "house_announcement",
        entityId: ctx.house.id,
        action: "bulk_deleted_archived",
        description: `Масово видалено архівні оголошення: ${count}.`,
        beforeSnapshot: announcements,
        metadata: {
          deletedCount: count,
        },
      },
    });
  },
};
