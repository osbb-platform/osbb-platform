import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseMeeting, UpdateMeetingPayload } from "../types";
import {
  getMeetingSnapshot,
  HOUSE_MEETING_ENTITY_TYPE,
  meetingTitle,
  meetingsHistoryMetadata,
  normalizeDisplayStatus,
  normalizeOptionalDate,
  normalizeText,
  publicMeetingsPaths,
  readIdAndLock,
  replaceMeetingQuestionsAndVotes,
  toLifecycleStatus,
  toMeetingStatus,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdateMeetingPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву зборів.", "VALIDATION_FAILED");
    }

    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return err("Додайте хоча б одне питання.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateMeetingPayload;
    const beforeResult = await getMeetingSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const now = new Date().toISOString();
    const displayStatus = normalizeDisplayStatus(
      payload.status ?? before.meeting.display_status,
    );
    const lifecycleStatus = toLifecycleStatus(displayStatus);

    const { data, error } = await ctx.supabase
      .from("house_meetings")
      .update({
        title: normalizeText(payload.title),
        short_description: normalizeText(payload.shortDescription),
        agenda: normalizeText(payload.agenda),
        meeting_date: normalizeOptionalDate(payload.meetingDateTime),
        location: normalizeText(payload.location),
        meeting_status: toMeetingStatus(displayStatus),
        display_status: displayStatus,
        protocol_pdf: normalizeText(payload.protocolPdf),
        protocol_document_id: normalizeText(payload.protocolDocumentId),
        lifecycle_status: lifecycleStatus,
        updated_at: now,
        published_at:
          lifecycleStatus === "published"
            ? before.meeting.published_at ?? now
            : before.meeting.published_at,
        archived_at:
          lifecycleStatus === "archived"
            ? before.meeting.archived_at ?? now
            : null,
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

    const replaceResult = await replaceMeetingQuestionsAndVotes(ctx, {
      meetingId: meeting.id,
      questions: payload.questions ?? [],
      manualVotes: payload.manualVotes,
    });

    if (!replaceResult.ok) {
      return replaceResult;
    }

    return ok({
      data: meeting,
      history: {
        entityType: HOUSE_MEETING_ENTITY_TYPE,
        entityId: meeting.id,
        action: "updated",
        description: `Оновлено збори «${meeting.title}».`,
        beforeSnapshot: before,
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
          : {
              complete: {
                entityType: HOUSE_MEETING_ENTITY_TYPE,
                entityId: meeting.id,
              },
            },
      extraRevalidatePaths: publicMeetingsPaths(ctx.house.slug),
    });
  },
};
