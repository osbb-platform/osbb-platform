import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { ReplaceMeetingQuestionsPayload } from "../types";
import {
  getMeetingSnapshot,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
  replaceMeetingQuestionsAndVotes,
} from "./shared";

export const replaceQuestionsCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<ReplaceMeetingQuestionsPayload>;

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return err("Додайте хоча б одне питання.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplaceMeetingQuestionsPayload;
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

    const replaceResult = await replaceMeetingQuestionsAndVotes(ctx, {
      meetingId: payload.id,
      questions: payload.questions,
      manualVotes: payload.manualVotes,
    });

    if (!replaceResult.ok) {
      return replaceResult;
    }

    const afterResult = await getMeetingSnapshot(ctx, payload.id);
    if (!afterResult.ok) return afterResult;

    return ok({
      data: afterResult.data,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: payload.id,
        action: "questions.replaced",
        description: `Оновлено питання зборів «${before.meeting.title}».`,
        beforeSnapshot: before,
        afterSnapshot: afterResult.data,
        metadata: meetingsHistoryMetadata({
          displayStatus: before.meeting.display_status,
        }),
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
