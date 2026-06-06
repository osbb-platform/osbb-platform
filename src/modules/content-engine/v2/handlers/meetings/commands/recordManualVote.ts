import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { RecordManualVotePayload } from "../types";
import {
  getMeetingSnapshot,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
  recordManualVotes,
} from "./shared";

export const recordManualVoteCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<RecordManualVotePayload>;

    if (!payload.apartmentId) {
      return err("Оберіть квартиру.", "VALIDATION_FAILED");
    }

    if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
      return err("Заповніть відповіді голосування.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as RecordManualVotePayload;
    const beforeResult = await getMeetingSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    const meetingUpdateResult = await ctx.supabase
      .from("house_meetings")
      .update({
        updated_at: new Date().toISOString(),
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (meetingUpdateResult.error) {
      return err(meetingUpdateResult.error.message, "INTERNAL");
    }

    if (!meetingUpdateResult.data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const recordResult = await recordManualVotes(ctx, {
      meetingId: payload.id,
      apartmentId: payload.apartmentId,
      answers: payload.answers,
    });

    if (!recordResult.ok) {
      return recordResult;
    }

    const afterResult = await getMeetingSnapshot(ctx, payload.id);
    if (!afterResult.ok) return afterResult;

    return ok({
      data: afterResult.data,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: payload.id,
        action: "manual_vote.recorded",
        description: `Внесено ручний голос для зборів «${before.meeting.title}».`,
        beforeSnapshot: before,
        afterSnapshot: afterResult.data,
        metadata: meetingsHistoryMetadata({
          displayStatus: before.meeting.display_status,
          apartmentId: payload.apartmentId,
        }),
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
