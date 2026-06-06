import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, CreateAnnouncementPayload } from "../types";

const validLevels = ["info", "warning", "danger"];

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateAnnouncementPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть заголовок оголошення.", "VALIDATION_FAILED");
    }

    if (!payload.body?.trim()) {
      return err("Заповніть текст оголошення.", "VALIDATION_FAILED");
    }

    if (!validLevels.includes(payload.level ?? "")) {
      return err("Невірний тип оголошення.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateAnnouncementPayload;

    const { data, error } = await ctx.supabase
      .from("house_announcements")
      .insert({
        house_id: ctx.house.id,
        title: payload.title.trim(),
        body: payload.body.trim(),
        level: payload.level,
        lifecycle_status: "draft",
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(
        `Не вдалося створити оголошення: ${error?.message ?? "невідома помилка"}`,
        "INTERNAL",
      );
    }

    const announcement = data as Announcement;

    return ok({
      data: announcement,
      history: {
        entityType: "house_announcement",
        entityId: announcement.id,
        action: "created",
        description: `Створено оголошення «${announcement.title}».`,
        afterSnapshot: announcement,
      },
      tasks: {
        ensure: {
          entityType: "house_announcement",
          entityId: announcement.id,
          title: announcement.title,
        },
      },
    });
  },
};
