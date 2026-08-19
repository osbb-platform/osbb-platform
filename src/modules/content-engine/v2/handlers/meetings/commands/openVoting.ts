import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  HouseMeeting,
  OpenMeetingVotingPayload,
} from "../types";
import {
  getMeeting,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
} from "./shared";

export const openVotingCommand: CommandSpec = {
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
    const payload = rawPayload as OpenMeetingVotingPayload;

    const beforeResult = await getMeeting(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    if (before.voting_mode !== "online") {
      return err(
        "Онлайн-голосування можна відкрити лише для зборів типу «Онлайн».",
        "VALIDATION_FAILED",
      );
    }

    if (
      before.lifecycle_status !== "published" ||
      before.display_status !== "scheduled" ||
      before.meeting_status !== "scheduled"
    ) {
      return err(
        "Відкрити голосування можна лише для опублікованих запланованих зборів.",
        "VALIDATION_FAILED",
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_meetings")
      .update({
        display_status: "active",
        meeting_status: "in_progress",
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

    const apartmentsResult = await ctx.supabase
      .from("house_apartments")
      .select("id")
      .eq("house_id", ctx.house.id)
      .is("archived_at", null)
      .is("area", null);

    const apartmentsWithoutArea =
      apartmentsResult.error ? null : (apartmentsResult.data ?? []).length;

    return ok({
      data: {
        ...meeting,
        onlineVotingWarning:
          apartmentsWithoutArea && apartmentsWithoutArea > 0
            ? {
                code: "APARTMENTS_WITHOUT_AREA",
                count: apartmentsWithoutArea,
              }
            : null,
      },
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "online_voting.opened",
        description: `Відкрито онлайн-голосування для зборів «${meeting.title}».`,
        beforeSnapshot: before,
        afterSnapshot: meeting,
        metadata: meetingsHistoryMetadata({
          votingMode: meeting.voting_mode,
          displayStatus: meeting.display_status,
          apartmentsWithoutArea,
        }),
      },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
