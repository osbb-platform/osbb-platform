import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, ReplaceAnnouncementPdfPayload } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  announcementHistoryMetadata,
  getAnnouncement,
  normalizeAnnouncementPdfInput,
  pdfDeleteRef,
  publicAnnouncementPaths,
  readIdAndLock,
  toFileTrack,
} from "./shared";

export const replacePdfCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplaceAnnouncementPdfPayload;
    const beforeResult = await getAnnouncement(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const pdfResult = normalizeAnnouncementPdfInput(payload.pdf, {
      houseId: ctx.house.id,
      announcementId: payload.id,
      requirePdf: true,
    });

    if (!pdfResult.ok) {
      return pdfResult;
    }

    const pdf = pdfResult.data;

    if (!pdf) {
      return err("PDF не завантажено.", "VALIDATION_FAILED");
    }

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
        action: "pdf_replaced",
        description: `Замінено PDF оголошення «${announcement.title}».`,
        beforeSnapshot: before,
        afterSnapshot: announcement,
        metadata: announcementHistoryMetadata(),
      },
      filesToDelete: [pdfDeleteRef(announcement.id)],
      filesToTrack: [toFileTrack(pdf)],
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
