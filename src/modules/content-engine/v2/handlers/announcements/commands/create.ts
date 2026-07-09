import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, CreateAnnouncementPayload } from "../types";
import {
  HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
  announcementHistoryMetadata,
  normalizeAnnouncementPdfInput,
  normalizeBody,
  normalizeLevel,
  normalizeOptionalAnnouncementId,
  normalizeText,
  publicAnnouncementPaths,
  toFileTrack,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateAnnouncementPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть заголовок оголошення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateAnnouncementPayload;
    const now = new Date().toISOString();
    const explicitId = normalizeOptionalAnnouncementId(payload.id);

    const pdfResult = normalizeAnnouncementPdfInput(payload.pdf, {
      houseId: ctx.house.id,
      announcementId: explicitId,
    });

    if (!pdfResult.ok) {
      return pdfResult;
    }

    const pdf = pdfResult.data;

    const insertPayload: Record<string, unknown> = {
      house_id: ctx.house.id,
      title: normalizeText(payload.title),
      body: normalizeBody(payload.body),
      level: normalizeLevel(payload.level),
      lifecycle_status: "draft",
      published_at: null,
      archived_at: null,
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };

    if (explicitId) {
      insertPayload.id = explicitId;
    }

    const { data, error } = await ctx.supabase
      .from("house_announcements")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Не вдалося створити оголошення.", "INTERNAL");
    }

    const announcement = data as Announcement;

    return ok({
      data: announcement,
      history: {
        entityType: HOUSE_ANNOUNCEMENT_ENTITY_TYPE,
        entityId: announcement.id,
        action: "created",
        description: `Створено оголошення «${announcement.title}».`,
        beforeSnapshot: null,
        afterSnapshot: announcement,
        metadata: announcementHistoryMetadata(),
      },
      filesToTrack: pdf ? [toFileTrack(pdf)] : undefined,
      extraRevalidatePaths: publicAnnouncementPaths(ctx.house.slug),
    });
  },
};
