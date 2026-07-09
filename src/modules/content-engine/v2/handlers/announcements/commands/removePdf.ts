import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, RemoveAnnouncementPdfPayload } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  announcementHistoryMetadata,
  getAnnouncement,
  pdfDeleteRef,
  publicAnnouncementPaths,
  readIdAndLock,
} from "./shared";

export const removePdfCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as RemoveAnnouncementPdfPayload;
    const beforeResult = await getAnnouncement(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_announcements")
      .update({
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
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
        action: "pdf_removed",
        description: `Видалено PDF оголошення «${announcement.title}».`,
        beforeSnapshot: before,
        afterSnapshot: announcement,
        metadata: announcementHistoryMetadata(),
      },
      filesToDelete: [pdfDeleteRef(announcement.id)],
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
