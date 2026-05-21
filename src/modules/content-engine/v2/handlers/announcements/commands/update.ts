import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, UpdateAnnouncementPayload } from "../types";

const validLevels = ["info", "warning", "danger"];

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<UpdateAnnouncementPayload>;

    if (!payload.id) {
      return err("Не передано ID оголошення.", "VALIDATION_FAILED");
    }

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію оголошення.", "VALIDATION_FAILED");
    }

    if (!payload.title?.trim()) {
      return err("Заповніть заголовок.", "VALIDATION_FAILED");
    }

    if (!payload.body?.trim()) {
      return err("Заповніть текст.", "VALIDATION_FAILED");
    }

    if (!validLevels.includes(payload.level ?? "")) {
      return err("Невірний тип оголошення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateAnnouncementPayload;

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

    const { data: updated, error } = await ctx.supabase
      .from("house_announcements")
      .update({
        title: payload.title.trim(),
        body: payload.body.trim(),
        level: payload.level,
        lock_version: payload.lockVersion + 1,
        updated_at: new Date().toISOString(),
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
        action: "updated",
        description: `Оновлено оголошення «${announcement.title}».`,
        beforeSnapshot: existing,
        afterSnapshot: announcement,
      },
    });
  },
};
