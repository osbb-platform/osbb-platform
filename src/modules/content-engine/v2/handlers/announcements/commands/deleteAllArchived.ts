import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  allFilesDeleteRef,
  announcementHistoryMetadata,
  publicAnnouncementPaths,
} from "./shared";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async validate() {
    return ok(undefined);
  },

  async execute(_rawPayload, ctx) {
    const { data: archived, error: selectError } = await ctx.supabase
      .from("house_announcements")
      .select("*")
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived");

    if (selectError) {
      return err(selectError.message, "INTERNAL");
    }

    const archivedAnnouncements = (archived ?? []) as Announcement[];

    if (!archivedAnnouncements.length) {
      return ok({
        data: { deletedCount: 0 },
        history: {
          entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
          entityId: ctx.house.id,
          action: "delete_all_archived",
          description: "Архів оголошень вже порожній.",
          beforeSnapshot: null,
          afterSnapshot: { deletedCount: 0 },
          metadata: announcementHistoryMetadata(),
        },
        extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
      });
    }

    const { error: deleteError } = await ctx.supabase
      .from("house_announcements")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived");

    if (deleteError) {
      return err(deleteError.message, "INTERNAL");
    }

    return ok({
      data: { deletedCount: archivedAnnouncements.length },
      history: {
        entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "delete_all_archived",
        description: `Видалено архівні оголошення: ${archivedAnnouncements.length}.`,
        beforeSnapshot: { archived: archivedAnnouncements },
        afterSnapshot: { deletedCount: archivedAnnouncements.length },
        metadata: announcementHistoryMetadata({
          deletedIds: archivedAnnouncements.map((item) => item.id),
        }),
      },
      filesToDelete: archivedAnnouncements.map((item) => allFilesDeleteRef(item.id)),
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
