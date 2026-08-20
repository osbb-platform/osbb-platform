import { randomUUID } from "node:crypto";

import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_POLL_ENTITY_TYPE,
  type HousePoll,
  type HousePollIdentityMode,
  type HousePollOption,
  type HousePollQuestion,
  type HousePollQuestionType,
  type HousePollResultsVisibility,
  type PollIdAndLock,
  type PollQuestionPayload,
} from "../types";

export { HOUSE_POLL_ENTITY_TYPE };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const QUESTION_TYPES: HousePollQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "yes_no",
  "scale",
  "free_text",
];

const IDENTITY_MODES: HousePollIdentityMode[] = ["open", "anonymous"];

const RESULTS_VISIBILITIES: HousePollResultsVisibility[] = [
  "immediate",
  "after_completion",
  "hidden",
];

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

export function normalizeUuid(value: unknown) {
  const text = normalizeText(value);
  return UUID_PATTERN.test(text) ? text : null;
}

export function normalizeIdentityMode(
  value: unknown,
  fallback: HousePollIdentityMode = "open",
): HousePollIdentityMode {
  return typeof value === "string" &&
    IDENTITY_MODES.includes(value as HousePollIdentityMode)
    ? (value as HousePollIdentityMode)
    : fallback;
}

export function normalizeResultsVisibility(
  value: unknown,
  fallback: HousePollResultsVisibility = "after_completion",
): HousePollResultsVisibility {
  return typeof value === "string" &&
    RESULTS_VISIBILITIES.includes(value as HousePollResultsVisibility)
    ? (value as HousePollResultsVisibility)
    : fallback;
}

export function readIdAndLock(rawPayload: unknown): Result<PollIdAndLock> {
  const payload = rawPayload as Partial<PollIdAndLock>;

  if (typeof payload.id !== "string" || !payload.id.trim()) {
    return err("Не передано ID опитування.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію опитування.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id.trim(),
    lockVersion: payload.lockVersion,
  });
}

export function normalizePollQuestions(
  value: unknown,
): Result<PollQuestionPayload[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return err("Додайте хоча б одне питання.", "VALIDATION_FAILED");
  }

  const questions: PollQuestionPayload[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];

    if (!item || typeof item !== "object") {
      return err(
        `Питання №${index + 1} має некоректний формат.`,
        "VALIDATION_FAILED",
      );
    }

    const raw = item as Record<string, unknown>;
    const question = normalizeText(raw.question ?? raw.title);
    const questionType = raw.questionType ?? raw.type;

    if (!question) {
      return err(
        `Заповніть текст питання №${index + 1}.`,
        "VALIDATION_FAILED",
      );
    }

    if (
      typeof questionType !== "string" ||
      !QUESTION_TYPES.includes(questionType as HousePollQuestionType)
    ) {
      return err(
        `Оберіть коректний тип питання №${index + 1}.`,
        "VALIDATION_FAILED",
      );
    }

    const normalizedType = questionType as HousePollQuestionType;
    const rawOptions = Array.isArray(raw.options) ? raw.options : [];

    const options = rawOptions.map((option, optionIndex) => {
      const record =
        option && typeof option === "object"
          ? (option as Record<string, unknown>)
          : {};
      return {
        id: normalizeUuid(record.id) ?? undefined,
        label: normalizeText(record.label),
        sortOrder:
          typeof record.sortOrder === "number"
            ? Math.trunc(record.sortOrder)
            : optionIndex,
      };
    });

    if (
      normalizedType === "single_choice" ||
      normalizedType === "multiple_choice"
    ) {
      if (options.length < 2 || options.some((option) => !option.label)) {
        return err(
          `Для питання №${index + 1} додайте щонайменше два непорожні варіанти.`,
          "VALIDATION_FAILED",
        );
      }
    } else if (options.length > 0) {
      return err(
        `Варіанти відповіді дозволені лише для питань з вибором (№${index + 1}).`,
        "VALIDATION_FAILED",
      );
    }

    let scaleMax: 5 | 10 | null = null;
    let scaleMinLabel: string | null = null;
    let scaleMaxLabel: string | null = null;

    if (normalizedType === "scale") {
      if (raw.scaleMax !== 5 && raw.scaleMax !== 10) {
        return err(
          `Для шкали питання №${index + 1} оберіть максимум 5 або 10.`,
          "VALIDATION_FAILED",
        );
      }

      scaleMax = raw.scaleMax;
      scaleMinLabel = normalizeNullableText(raw.scaleMinLabel);
      scaleMaxLabel = normalizeNullableText(raw.scaleMaxLabel);
    }

    questions.push({
      id: normalizeUuid(raw.id) ?? undefined,
      question,
      description: normalizeText(raw.description),
      questionType: normalizedType,
      scaleMax,
      scaleMinLabel,
      scaleMaxLabel,
      isRequired: raw.isRequired !== false,
      sortOrder:
        typeof raw.sortOrder === "number"
          ? Math.trunc(raw.sortOrder)
          : index,
      options:
        normalizedType === "single_choice" ||
        normalizedType === "multiple_choice"
          ? options
          : [],
    });
  }

  return ok(questions);
}

export async function getPoll(
  ctx: HandlerContext,
  pollId: string,
): Promise<Result<HousePoll>> {
  const { data, error } = await ctx.supabase
    .from("house_polls")
    .select("*")
    .eq("id", pollId)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) return err(error.message, "INTERNAL");
  if (!data) return err("Опитування не знайдено.", "NOT_FOUND");

  return ok(data as HousePoll);
}

export async function getPollQuestions(
  ctx: HandlerContext,
  pollId: string,
): Promise<Result<HousePollQuestion[]>> {
  const { data, error } = await ctx.supabase
    .from("house_poll_questions")
    .select("*")
    .eq("poll_id", pollId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) return err(error.message, "INTERNAL");
  return ok((data ?? []) as HousePollQuestion[]);
}

export async function getPollOptions(
  ctx: HandlerContext,
  questionIds: string[],
): Promise<Result<HousePollOption[]>> {
  if (questionIds.length === 0) return ok([]);

  const { data, error } = await ctx.supabase
    .from("house_poll_options")
    .select("*")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) return err(error.message, "INTERNAL");
  return ok((data ?? []) as HousePollOption[]);
}

export async function getPollSnapshot(ctx: HandlerContext, pollId: string) {
  const pollResult = await getPoll(ctx, pollId);
  if (!pollResult.ok) return pollResult;

  const questionsResult = await getPollQuestions(ctx, pollId);
  if (!questionsResult.ok) return questionsResult;

  const optionsResult = await getPollOptions(
    ctx,
    questionsResult.data.map((question) => question.id),
  );
  if (!optionsResult.ok) return optionsResult;

  return ok({
    poll: pollResult.data,
    questions: questionsResult.data,
    options: optionsResult.data,
  });
}

export async function pollHasParticipation(
  ctx: HandlerContext,
  pollId: string,
): Promise<Result<boolean>> {
  const { data, error } = await ctx.supabase
    .from("house_poll_participation")
    .select("poll_id")
    .eq("poll_id", pollId)
    .limit(1);

  if (error) return err(error.message, "INTERNAL");
  return ok((data ?? []).length > 0);
}

export async function replacePollQuestions(
  ctx: HandlerContext,
  params: {
    pollId: string;
    questions: PollQuestionPayload[];
  },
): Promise<Result<void>> {
  const normalizedResult = normalizePollQuestions(params.questions);
  if (!normalizedResult.ok) return normalizedResult;

  const normalized = normalizedResult.data;

  const deleteResult = await ctx.supabase
    .from("house_poll_questions")
    .delete()
    .eq("poll_id", params.pollId);

  if (deleteResult.error) return err(deleteResult.error.message, "INTERNAL");

  const questionRows = normalized.map((question, index) => ({
    id: normalizeUuid(question.id) ?? randomUUID(),
    poll_id: params.pollId,
    question: normalizeText(question.question),
    description: normalizeText(question.description),
    question_type: question.questionType,
    scale_max: question.questionType === "scale" ? question.scaleMax : null,
    scale_min_label:
      question.questionType === "scale"
        ? normalizeNullableText(question.scaleMinLabel)
        : null,
    scale_max_label:
      question.questionType === "scale"
        ? normalizeNullableText(question.scaleMaxLabel)
        : null,
    is_required: question.isRequired !== false,
    sort_order:
      typeof question.sortOrder === "number"
        ? Math.trunc(question.sortOrder)
        : index,
  }));

  const { error: questionsError } = await ctx.supabase
    .from("house_poll_questions")
    .insert(questionRows);

  if (questionsError) return err(questionsError.message, "INTERNAL");

  const optionRows = normalized.flatMap((question, questionIndex) => {
    if (
      question.questionType !== "single_choice" &&
      question.questionType !== "multiple_choice"
    ) {
      return [];
    }

    const questionId = questionRows[questionIndex].id;

    return (question.options ?? []).map((option, optionIndex) => ({
      id: normalizeUuid(option.id) ?? randomUUID(),
      question_id: questionId,
      label: normalizeText(option.label),
      sort_order:
        typeof option.sortOrder === "number"
          ? Math.trunc(option.sortOrder)
          : optionIndex,
    }));
  });

  if (optionRows.length > 0) {
    const { error: optionsError } = await ctx.supabase
      .from("house_poll_options")
      .insert(optionRows);

    if (optionsError) return err(optionsError.message, "INTERNAL");
  }

  return ok(undefined);
}

export async function ensurePollHasQuestions(
  ctx: HandlerContext,
  pollId: string,
): Promise<Result<void>> {
  const { data, error } = await ctx.supabase
    .from("house_poll_questions")
    .select("id")
    .eq("poll_id", pollId)
    .limit(1);

  if (error) return err(error.message, "INTERNAL");

  if ((data ?? []).length === 0) {
    return err(
      "Перед публікацією додайте хоча б одне питання.",
      "VALIDATION_FAILED",
    );
  }

  return ok(undefined);
}

export function pollsHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "polls",
    ...extra,
  };
}

export function publicPollPaths(houseSlug: string) {
  return [`/house/${houseSlug}/polls`, `/house/${houseSlug}`];
}

export function pollTaskTitle(poll: HousePoll) {
  return poll.title || "Опитування";
}
