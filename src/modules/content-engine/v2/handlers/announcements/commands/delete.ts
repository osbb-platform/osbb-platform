import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, AnnouncementIdAndLock } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  allFilesDeleteRef,
  announcementHistoryMetadata,
  getAnnouncement,
  publicAnnouncementPaths,
  readIdAndLock,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as AnnouncementIdAndLock;
    const beforeResult = await getAnnouncement(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;

    const { data, error } = await ctx.supabase
      .from("house_announcements")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const announcement = data as Announcement;

    return ok({
      data: announcement,
      history: {
        entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
        entityId: announcement.id,
        action: "deleted",
        description: `Видалено оголошення «${announcement.title}».`,
        beforeSnapshot: before,
        afterSnapshot: null,
        metadata: announcementHistoryMetadata(),
      },
      filesToDelete: [allFilesDeleteRef(announcement.id)],
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
