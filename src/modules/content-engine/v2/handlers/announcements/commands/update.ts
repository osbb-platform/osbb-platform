import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, UpdateAnnouncementPayload } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  announcementHistoryMetadata,
  getAnnouncement,
  normalizeAnnouncementPdfInput,
  normalizeBody,
  normalizeLevel,
  normalizeText,
  pdfDeleteRef,
  publicAnnouncementPaths,
  readIdAndLock,
  toFileTrack,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdateAnnouncementPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть заголовок оголошення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateAnnouncementPayload;
    const beforeResult = await getAnnouncement(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const pdfResult = normalizeAnnouncementPdfInput(payload.pdf, {
      houseId: ctx.house.id,
      announcementId: payload.id,
    });

    if (!pdfResult.ok) {
      return pdfResult;
    }

    const pdf = pdfResult.data;
    const shouldRemovePdf = payload.removePdf === true || Boolean(pdf);
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_announcements")
      .update({
        title: normalizeText(payload.title),
        body: normalizeBody(payload.body),
        level: normalizeLevel(payload.level),
        is_pinned: payload.isPinned === true,
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
        action: "updated",
        description: `Оновлено оголошення «${announcement.title}».`,
        beforeSnapshot: before,
        afterSnapshot: announcement,
        metadata: announcementHistoryMetadata(),
      },
      filesToDelete: shouldRemovePdf ? [pdfDeleteRef(announcement.id)] : undefined,
      filesToTrack: pdf ? [toFileTrack(pdf)] : undefined,
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
