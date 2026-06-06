import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { DeleteMeetingPayload, HouseMeeting } from "../types";
import {
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
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
    const payload = rawPayload as DeleteMeetingPayload;

    const { data, error } = await ctx.supabase
      .from("house_meetings")
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
      return err("Збори не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const meeting = data as HouseMeeting;

    return ok({
      data: meeting,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "deleted",
        description: `Видалено збори «${meeting.title}».`,
        beforeSnapshot: meeting,
        metadata: meetingsHistoryMetadata({
          displayStatus: meeting.display_status,
        }),
      },
      tasks: {
        delete: {
          entityType: HOUSE_MEETING_ENTITY_TYPE,
          entityId: meeting.id,
        },
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
