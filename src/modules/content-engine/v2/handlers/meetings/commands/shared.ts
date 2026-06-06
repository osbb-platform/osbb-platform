import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_MEETING_ENTITY_TYPE,
  type HouseMeeting,
  type HouseMeetingDisplayStatus,
  type HouseMeetingLifecycle,
  type HouseMeetingManualVote,
  type HouseMeetingQuestion,
  type HouseMeetingQuestionOutcome,
  type HouseMeetingStatus,
  type HouseMeetingVoteChoice,
  type MeetingIdAndLock,
  type MeetingManualVotePayload,
  type MeetingQuestionPayload,
} from "../types";

export { HOUSE_MEETING_ENTITY_TYPE };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const validDisplayStatuses: HouseMeetingDisplayStatus[] = [
  "draft",
  "scheduled",
  "active",
  "review",
  "completed",
  "archived",
];

const validOutcomes: HouseMeetingQuestionOutcome[] = [
  "approved",
  "rejected",
  "pending",
];

const validChoices: HouseMeetingVoteChoice[] = [
  "for",
  "against",
  "abstained",
];

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalDate(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeUuid(value: unknown) {
  const text = normalizeText(value);
  return uuidPattern.test(text) ? text : null;
}

export function normalizeDisplayStatus(value: unknown): HouseMeetingDisplayStatus {
  return typeof value === "string" &&
    validDisplayStatuses.includes(value as HouseMeetingDisplayStatus)
    ? (value as HouseMeetingDisplayStatus)
    : "draft";
}

export function toLifecycleStatus(
  displayStatus: HouseMeetingDisplayStatus,
): HouseMeetingLifecycle {
  if (displayStatus === "draft") return "draft";
  if (displayStatus === "archived") return "archived";
  return "published";
}

export function toMeetingStatus(
  displayStatus: HouseMeetingDisplayStatus,
): HouseMeetingStatus {
  if (displayStatus === "draft") return "draft";
  if (displayStatus === "scheduled") return "scheduled";
  if (displayStatus === "active") return "in_progress";
  if (
    displayStatus === "review" ||
    displayStatus === "completed" ||
    displayStatus === "archived"
  ) {
    return "closed";
  }

  return "draft";
}

export function readIdAndLock(rawPayload: unknown): Result<MeetingIdAndLock> {
  const payload = rawPayload as Partial<MeetingIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID зборів.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію зборів.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getMeeting(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HouseMeeting>> {
  const { data, error } = await ctx.supabase
    .from("house_meetings")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Збори не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseMeeting);
}

export async function getMeetingQuestions(
  ctx: HandlerContext,
  meetingId: string,
): Promise<Result<HouseMeetingQuestion[]>> {
  const { data, error } = await ctx.supabase
    .from("house_meeting_questions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: true });

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok((data ?? []) as HouseMeetingQuestion[]);
}

export async function getMeetingManualVotes(
  ctx: HandlerContext,
  meetingId: string,
): Promise<Result<HouseMeetingManualVote[]>> {
  const { data, error } = await ctx.supabase
    .from("house_meeting_manual_votes")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("recorded_at", { ascending: true });

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok((data ?? []) as HouseMeetingManualVote[]);
}

export async function getMeetingSnapshot(
  ctx: HandlerContext,
  meetingId: string,
) {
  const meetingResult = await getMeeting(ctx, meetingId);
  if (!meetingResult.ok) return meetingResult;

  const questionsResult = await getMeetingQuestions(ctx, meetingId);
  if (!questionsResult.ok) return questionsResult;

  const votesResult = await getMeetingManualVotes(ctx, meetingId);
  if (!votesResult.ok) return votesResult;

  return ok({
    meeting: meetingResult.data,
    questions: questionsResult.data,
    manualVotes: votesResult.data,
  });
}

function normalizeOutcome(value: unknown): HouseMeetingQuestionOutcome {
  return typeof value === "string" &&
    validOutcomes.includes(value as HouseMeetingQuestionOutcome)
    ? (value as HouseMeetingQuestionOutcome)
    : "pending";
}

function normalizeChoice(value: unknown): HouseMeetingVoteChoice | null {
  return typeof value === "string" &&
    validChoices.includes(value as HouseMeetingVoteChoice)
    ? (value as HouseMeetingVoteChoice)
    : null;
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

export function normalizeQuestions(value: unknown): MeetingQuestionPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const questions: MeetingQuestionPayload[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const title = normalizeText(raw.title ?? raw.question);

    if (!title) continue;

    questions.push({
      id: normalizeText(raw.id),
      title,
      question: title,
      description: normalizeText(raw.description),
      decisionDraft: normalizeText(raw.decisionDraft),
      order:
        typeof raw.order === "number"
          ? Math.trunc(raw.order)
          : typeof raw.sortOrder === "number"
            ? Math.trunc(raw.sortOrder)
            : questions.length,
      votesFor: normalizeCount(raw.votesFor),
      votesAgainst: normalizeCount(raw.votesAgainst),
      votesAbstained: normalizeCount(raw.votesAbstained),
      totalApartmentsVoted: normalizeCount(raw.totalApartmentsVoted),
      approvalOutcome: normalizeOutcome(raw.approvalOutcome),
    });
  }

  return questions;
}

export function normalizeManualVotes(value: unknown): MeetingManualVotePayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const votes: MeetingManualVotePayload[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const apartmentId = normalizeUuid(raw.apartmentId);

    if (!apartmentId) continue;

    const rawAnswers = Array.isArray(raw.answers) ? raw.answers : [];
    const answers = rawAnswers
      .map((answer) => {
        if (!answer || typeof answer !== "object") return null;

        const answerRecord = answer as Record<string, unknown>;
        const choice = normalizeChoice(answerRecord.choice);

        if (!choice) return null;

        return {
          questionId: normalizeText(answerRecord.questionId),
          choice,
        };
      })
      .filter(Boolean) as MeetingManualVotePayload["answers"];

    if (answers.length === 0) continue;

    votes.push({
      apartmentId,
      apartmentLabel: normalizeText(raw.apartmentLabel),
      submittedAt: normalizeOptionalDate(raw.submittedAt) ?? undefined,
      answers,
    });
  }

  return votes;
}

export async function replaceMeetingQuestionsAndVotes(
  ctx: HandlerContext,
  params: {
    meetingId: string;
    questions: MeetingQuestionPayload[];
    manualVotes?: MeetingManualVotePayload[];
  },
): Promise<Result<void>> {
  const normalizedQuestions = normalizeQuestions(params.questions);

  if (normalizedQuestions.length === 0) {
    return err("Додайте хоча б одне питання.", "VALIDATION_FAILED");
  }

  const deleteResult = await ctx.supabase
    .from("house_meeting_questions")
    .delete()
    .eq("meeting_id", params.meetingId);

  if (deleteResult.error) {
    return err(deleteResult.error.message, "INTERNAL");
  }

  const questionIdMap = new Map<string, string>();

  const { data: insertedQuestions, error: insertQuestionsError } =
    await ctx.supabase
      .from("house_meeting_questions")
      .insert(
        normalizedQuestions.map((question, index) => {
          const normalizedId = normalizeUuid(question.id);
          const row = {
            ...(normalizedId ? { id: normalizedId } : {}),
            meeting_id: params.meetingId,
            question: normalizeText(question.title ?? question.question),
            description: normalizeText(question.description),
            decision_draft: normalizeText(question.decisionDraft),
            sort_order:
              typeof question.order === "number"
                ? Math.trunc(question.order)
                : index,
            votes_for: normalizeCount(question.votesFor),
            votes_against: normalizeCount(question.votesAgainst),
            votes_abstained: normalizeCount(question.votesAbstained),
            total_apartments_voted: normalizeCount(question.totalApartmentsVoted),
            approval_outcome: normalizeOutcome(question.approvalOutcome),
          };

          return row;
        }),
      )
      .select("*");

  if (insertQuestionsError) {
    return err(insertQuestionsError.message, "INTERNAL");
  }

  const inserted = (insertedQuestions ?? []) as HouseMeetingQuestion[];

  normalizedQuestions.forEach((question, index) => {
    const originalId = normalizeText(question.id);
    const insertedId = inserted[index]?.id;

    if (originalId && insertedId) {
      questionIdMap.set(originalId, insertedId);
    }
  });

  const normalizedVotes = normalizeManualVotes(params.manualVotes);

  if (normalizedVotes.length > 0) {
    const voteRows = normalizedVotes.flatMap((vote) =>
      vote.answers.flatMap((answer) => {
        const questionId =
          questionIdMap.get(answer.questionId) ?? normalizeUuid(answer.questionId);

        if (!questionId) return [];

        return [
          {
            meeting_id: params.meetingId,
            apartment_id: vote.apartmentId,
            apartment_label: vote.apartmentLabel ?? "",
            question_id: questionId,
            choice: answer.choice,
            recorded_at: vote.submittedAt ?? new Date().toISOString(),
          },
        ];
      }),
    );

    if (voteRows.length > 0) {
      const { error: insertVotesError } = await ctx.supabase
        .from("house_meeting_manual_votes")
        .insert(voteRows);

      if (insertVotesError) {
        return err(insertVotesError.message, "INTERNAL");
      }
    }
  }

  const { error: recalculateError } = await ctx.supabase.rpc(
    "recalculate_house_meeting_question_counters",
    {
      p_meeting_id: params.meetingId,
    },
  );

  if (recalculateError) {
    return err(recalculateError.message, "INTERNAL");
  }

  return ok(undefined);
}

export async function recordManualVotes(
  ctx: HandlerContext,
  params: {
    meetingId: string;
    apartmentId: string;
    answers: Array<{ questionId: string; choice: HouseMeetingVoteChoice }>;
  },
): Promise<Result<void>> {
  for (const answer of params.answers) {
    const questionId = normalizeUuid(answer.questionId);
    const choice = normalizeChoice(answer.choice);

    if (!questionId || !choice) {
      return err("Некоректні відповіді голосування.", "VALIDATION_FAILED");
    }

    const { error } = await ctx.supabase.rpc("record_house_meeting_manual_vote", {
      p_meeting_id: params.meetingId,
      p_apartment_id: params.apartmentId,
      p_question_id: questionId,
      p_choice: choice,
    });

    if (error) {
      return err(error.message, "INTERNAL");
    }
  }

  return ok(undefined);
}

export function meetingsHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "meetings",
    ...extra,
  };
}

export function publicMeetingsPaths(houseSlug: string) {
  return [`/house/${houseSlug}/meetings`, `/house/${houseSlug}`];
}

export function meetingTitle(meeting: HouseMeeting) {
  return meeting.title || "Збори";
}
