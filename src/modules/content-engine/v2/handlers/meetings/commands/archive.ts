import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { ArchiveMeetingPayload, HouseMeeting } from "../types";
import {
  getMeeting,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
} from "./shared";

export const archiveCommand: CommandSpec = {
  actionKey: "archive",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ArchiveMeetingPayload;
    const beforeResult = await getMeeting(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_meetings")
      .update({
        lifecycle_status: "archived",
        display_status: "archived",
        meeting_status: "closed",
        archived_at: before.archived_at ?? now,
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

    const meeting = data as HouseMeeting;

    return ok({
      data: meeting,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "archived",
        description: `Архівовано збори «${meeting.title}».`,
        beforeSnapshot: before,
        afterSnapshot: meeting,
        metadata: meetingsHistoryMetadata({
          displayStatus: meeting.display_status,
        }),
      },
      tasks: {
        complete: {
          entityType: HOUSE_MEETING_ENTITY_TYPE,
          entityId: meeting.id,
        },
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
