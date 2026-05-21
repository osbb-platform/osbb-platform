import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { Announcement, AnnouncementIdAndLock } from "../types";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
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

    const { data: deleted, error } = await ctx.supabase
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

    if (!deleted) {
      return err("Оголошення не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const announcement = deleted as Announcement;

    return ok({
      data: announcement,
      history: {
        entityType: "house_announcement",
        entityId: announcement.id,
        action: "deleted",
        description: `Видалено оголошення «${announcement.title}».`,
        beforeSnapshot: announcement,
      },
      tasks: {
        delete: {
          entityType: "house_announcement",
          entityId: announcement.id,
        },
      },
    });
  },
};
