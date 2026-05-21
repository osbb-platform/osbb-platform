import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, AnnouncementIdAndLock } from "../types";

export const archiveCommand: CommandSpec = {
  actionKey: "archive",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<AnnouncementIdAndLock>;

    if (!payload.id) {
      return err("Не передано ID оголошення.", "VALIDATION_FAILED");
    }

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію оголошення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as AnnouncementIdAndLock;

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_announcements")
      .select("*")
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .maybeSingle();

    if (existingError) {
      return err(existingError.message, "INTERNAL");
    }

    if (!existing) {
      return err("Оголошення не знайдено.", "NOT_FOUND");
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await ctx.supabase
      .from("house_announcements")
      .update({
        lifecycle_status: "archived",
        archived_at: now,
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

    if (!updated) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const announcement = updated as Announcement;

    return ok({
      data: announcement,
      history: {
        entityType: "house_announcement",
        entityId: announcement.id,
        action: "archived",
        description: `Архівовано оголошення «${announcement.title}».`,
        beforeSnapshot: existing,
        afterSnapshot: announcement,
      },
      tasks: {
        complete: {
          entityType: "house_announcement",
          entityId: announcement.id,
        },
      },
    });
  },
};
