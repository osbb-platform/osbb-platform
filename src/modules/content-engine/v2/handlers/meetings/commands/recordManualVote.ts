import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { RecordManualVotePayload } from "../types";
import {
  getMeetingSnapshot,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingsHistoryMetadata,
  publicMeetingsPaths,
  readIdAndLock,
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

    if (before.meeting.voting_mode !== "manual") {
      return err(
        "Ручне голосування недоступне для онлайн-зборів.",
        "VALIDATION_FAILED",
      );
    }

    const admin = createSupabaseAdminClient();
    const { error: ballotError } = await admin.rpc(
      "record_house_meeting_manual_ballot",
      {
        p_meeting_id: payload.id,
        p_apartment_id: payload.apartmentId,
        p_expected_lock_version: payload.lockVersion,
        p_answers: payload.answers,
      },
    );

    if (ballotError) {
      if ((ballotError.message ?? "").includes("STALE_CONTENT")) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      console.error("P06 atomic manual ballot failed", {
        meetingId: payload.id,
        code: ballotError.code ?? null,
        message: ballotError.message,
      });

      return err("Не вдалося зберегти ручний голос.", "INTERNAL");
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
