import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateMeetingPayload, HouseMeeting } from "../types";
import {
  HOUSE_MEETING_ENTITY_TYPE,
  meetingTitle,
  meetingsHistoryMetadata,
  normalizeDisplayStatus,
  normalizeOptionalDate,
  normalizeText,
  normalizeVotingMode,
  publicMeetingsPaths,
  replaceMeetingQuestionsAndVotes,
  toLifecycleStatus,
  toMeetingStatus,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateMeetingPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву зборів.", "VALIDATION_FAILED");
    }

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return err("Додайте хоча б одне питання.", "VALIDATION_FAILED");
    }

    const votingMode = normalizeVotingMode(payload.votingMode);

    if (
      votingMode === "online" &&
      Array.isArray(payload.manualVotes) &&
      payload.manualVotes.length > 0
    ) {
      return err(
        "Ручні голоси не можна додавати до онлайн-зборів.",
        "VALIDATION_FAILED",
      );
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateMeetingPayload;
    const now = new Date().toISOString();
    const displayStatus = normalizeDisplayStatus(payload.status);
    const lifecycleStatus = toLifecycleStatus(displayStatus);
    const votingMode = normalizeVotingMode(payload.votingMode);

    const { data, error } = await ctx.supabase
      .from("house_meetings")
      .insert({
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        short_description: normalizeText(payload.shortDescription),
        agenda: normalizeText(payload.agenda),
        meeting_date: normalizeOptionalDate(payload.meetingDateTime),
        location: normalizeText(payload.location),
        meeting_status: toMeetingStatus(displayStatus),
        display_status: displayStatus,
        voting_mode: votingMode,
        protocol_pdf: normalizeText(payload.protocolPdf),
        protocol_document_id: normalizeText(payload.protocolDocumentId),
        lifecycle_status: lifecycleStatus,
        lock_version: 1,
        created_at: now,
        updated_at: now,
        published_at: lifecycleStatus === "published" ? now : null,
        archived_at: lifecycleStatus === "archived" ? now : null,
        created_by: ctx.user.id,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(error?.message ?? "Не вдалося створити збори.", "INTERNAL");
    }

    const meeting = data as HouseMeeting;

    const replaceResult = await replaceMeetingQuestionsAndVotes(ctx, {
      meetingId: meeting.id,
      questions: payload.questions ?? [],
      manualVotes: votingMode === "manual" ? payload.manualVotes : undefined,
    });

    if (!replaceResult.ok) {
      return replaceResult;
    }

    return ok({
      data: meeting,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "created",
        description: `Створено збори «${meeting.title}».`,
        afterSnapshot: meeting,
        metadata: meetingsHistoryMetadata({
          displayStatus: meeting.display_status,
        }),
      },
      tasks:
        meeting.lifecycle_status === "draft"
          ? {
              ensure: {
                entityType: HOUSE_MEETING_ENTITY_TYPE,
                entityId: meeting.id,
                title: meetingTitle(meeting),
              },
            }
          : undefined,
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
