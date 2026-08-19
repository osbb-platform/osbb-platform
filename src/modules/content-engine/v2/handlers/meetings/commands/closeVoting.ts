import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  CloseMeetingVotingPayload,
  HouseMeeting,
} from "../types";
import {
  getMeeting,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
} from "./shared";

export const closeVotingCommand: CommandSpec = {
  actionKey: "publish",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const result = await readIdAndLock(rawPayload);

    if (!result.ok) {
      return result;
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CloseMeetingVotingPayload;

    const beforeResult = await getMeeting(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (before.voting_mode !== "online") {
      return err(
        "Онлайн-голосування можна закрити лише для зборів типу «Онлайн».",
        "VALIDATION_FAILED",
      );
    }

    if (
      before.lifecycle_status !== "published" ||
      before.display_status !== "active" ||
      before.meeting_status !== "in_progress"
    ) {
      return err(
        "Закрити можна лише активне онлайн-голосування.",
        "VALIDATION_FAILED",
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_meetings")
      .update({
        display_status: "review",
        meeting_status: "closed",
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
      return err(
        "Дані застаріли, оновіть сторінку.",
        "STALE_CONTENT",
      );
    }

    const meeting = data as HouseMeeting;

    return ok({
      data: meeting,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "online_voting.closed",
        description: `Закрито онлайн-голосування для зборів «${meeting.title}».`,
        beforeSnapshot: before,
        afterSnapshot: meeting,
        metadata: meetingsHistoryMetadata({
          votingMode: meeting.voting_mode,
          displayStatus: meeting.display_status,
        }),
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
