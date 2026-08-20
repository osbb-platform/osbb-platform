import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export type PollAnswerInput =
  | { questionId: string; optionId: string }
  | { questionId: string; optionIds: string[] }
  | { questionId: string; value: boolean }
  | { questionId: string; value: number }
  | { questionId: string; value: string };

type PollRow = {
  id: string;
  house_id: string;
  title: string;
  identity_mode: "open" | "anonymous";
  lifecycle_status: "draft" | "published" | "archived";
  poll_status: "idle" | "active" | "completed";
};

type QuestionRow = {
  id: string;
  question_type: "single_choice" | "multiple_choice" | "yes_no" | "scale" | "free_text";
  scale_max: 5 | 10 | null;
  is_required: boolean;
};

type OptionRow = { id: string; question_id: string };

export type SubmitPollAnswersDbResult =
  | { ok: true; code: "SUBMITTED"; identityMode: "open" | "anonymous" }
  | { ok: false; code: "POLL_NOT_ACTIVE" | "APARTMENT_INVALID" | "APARTMENT_ALREADY_ANSWERED" | "ANSWERS_INVALID" | "ANSWERS_INCOMPLETE" | "QUESTION_SCOPE_INVALID" | "ANSWER_TYPE_INVALID" | "OPTION_SCOPE_INVALID" };

function uniqueViolation(error: { code?: string | null; message?: string | null }) {
  return error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate key");
}

async function compensateParticipation(pollId: string, apartmentId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("house_poll_participation")
    .delete()
    .eq("poll_id", pollId)
    .eq("apartment_id", apartmentId);
  if (error) {
    console.error("P07 participation compensation failed", { pollId, message: error.message });
  }
}

export async function submitPollAnswersDb(params: {
  houseId: string;
  pollId: string;
  apartmentId: string;
  answers: PollAnswerInput[];
}): Promise<SubmitPollAnswersDbResult> {
  const supabase = createSupabaseAdminClient();

  const pollResult = await supabase
    .from("house_polls")
    .select("id,house_id,title,identity_mode,lifecycle_status,poll_status")
    .eq("id", params.pollId)
    .eq("house_id", params.houseId)
    .maybeSingle();
  if (pollResult.error) throw new Error(`P07 poll lookup failed: ${pollResult.error.message}`);

  const poll = pollResult.data as PollRow | null;
  if (!poll || poll.lifecycle_status !== "published" || poll.poll_status !== "active") {
    return { ok: false, code: "POLL_NOT_ACTIVE" };
  }

  const apartmentResult = await supabase
    .from("house_apartments")
    .select("id")
    .eq("id", params.apartmentId)
    .eq("house_id", params.houseId)
    .is("archived_at", null)
    .maybeSingle();
  if (apartmentResult.error) throw new Error(`P07 apartment lookup failed: ${apartmentResult.error.message}`);
  if (!apartmentResult.data) return { ok: false, code: "APARTMENT_INVALID" };

  const questionsResult = await supabase
    .from("house_poll_questions")
    .select("id,question_type,scale_max,is_required")
    .eq("poll_id", params.pollId);
  if (questionsResult.error) throw new Error(`P07 questions lookup failed: ${questionsResult.error.message}`);

  const questions = (questionsResult.data ?? []) as QuestionRow[];
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const answerByQuestion = new Map<string, PollAnswerInput>();

  if (!Array.isArray(params.answers)) return { ok: false, code: "ANSWERS_INVALID" };

  for (const answer of params.answers) {
    const questionId = typeof answer?.questionId === "string" ? answer.questionId.trim() : "";
    if (!questionId || answerByQuestion.has(questionId)) return { ok: false, code: "ANSWERS_INVALID" };
    if (!questionById.has(questionId)) return { ok: false, code: "QUESTION_SCOPE_INVALID" };
    answerByQuestion.set(questionId, { ...answer, questionId } as PollAnswerInput);
  }

  for (const question of questions) {
    if (question.is_required && !answerByQuestion.has(question.id)) {
      return { ok: false, code: "ANSWERS_INCOMPLETE" };
    }
  }

  const choiceQuestionIds = questions
    .filter((q) => q.question_type === "single_choice" || q.question_type === "multiple_choice")
    .map((q) => q.id);

  let options: OptionRow[] = [];
  if (choiceQuestionIds.length > 0) {
    const optionsResult = await supabase
      .from("house_poll_options")
      .select("id,question_id")
      .in("question_id", choiceQuestionIds);
    if (optionsResult.error) throw new Error(`P07 options lookup failed: ${optionsResult.error.message}`);
    options = (optionsResult.data ?? []) as OptionRow[];
  }

  const optionQuestionById = new Map(options.map((o) => [o.id, o.question_id]));
  const answerRows: Array<Record<string, unknown>> = [];

  for (const [questionId, answer] of answerByQuestion) {
    const question = questionById.get(questionId);
    if (!question) return { ok: false, code: "QUESTION_SCOPE_INVALID" };
    const apartmentId = poll.identity_mode === "anonymous" ? null : params.apartmentId;

    if (question.question_type === "single_choice") {
      if (!("optionId" in answer) || typeof answer.optionId !== "string" || !answer.optionId.trim()) return { ok: false, code: "ANSWER_TYPE_INVALID" };
      const optionId = answer.optionId.trim();
      if (optionQuestionById.get(optionId) !== questionId) return { ok: false, code: "OPTION_SCOPE_INVALID" };
      answerRows.push({ poll_id: params.pollId, question_id: questionId, apartment_id: apartmentId, option_id: optionId, scale_value: null, bool_value: null, text_value: null });
      continue;
    }

    if (question.question_type === "multiple_choice") {
      if (!("optionIds" in answer) || !Array.isArray(answer.optionIds) || answer.optionIds.length === 0) return { ok: false, code: "ANSWER_TYPE_INVALID" };
      const optionIds = answer.optionIds.map((id) => typeof id === "string" ? id.trim() : "");
      if (new Set(optionIds).size !== optionIds.length || optionIds.some((id) => !id || optionQuestionById.get(id) !== questionId)) return { ok: false, code: "OPTION_SCOPE_INVALID" };
      for (const optionId of optionIds) answerRows.push({ poll_id: params.pollId, question_id: questionId, apartment_id: apartmentId, option_id: optionId, scale_value: null, bool_value: null, text_value: null });
      continue;
    }

    if (question.question_type === "yes_no") {
      if (!("value" in answer) || typeof answer.value !== "boolean") return { ok: false, code: "ANSWER_TYPE_INVALID" };
      answerRows.push({ poll_id: params.pollId, question_id: questionId, apartment_id: apartmentId, option_id: null, scale_value: null, bool_value: answer.value, text_value: null });
      continue;
    }

    if (question.question_type === "scale") {
      if (!("value" in answer) || typeof answer.value !== "number" || !Number.isInteger(answer.value) || typeof question.scale_max !== "number" || answer.value < 1 || answer.value > question.scale_max) return { ok: false, code: "ANSWER_TYPE_INVALID" };
      answerRows.push({ poll_id: params.pollId, question_id: questionId, apartment_id: apartmentId, option_id: null, scale_value: answer.value, bool_value: null, text_value: null });
      continue;
    }

    if (!("value" in answer) || typeof answer.value !== "string" || !answer.value.trim()) return { ok: false, code: "ANSWER_TYPE_INVALID" };
    answerRows.push({ poll_id: params.pollId, question_id: questionId, apartment_id: apartmentId, option_id: null, scale_value: null, bool_value: null, text_value: answer.value.trim() });
  }

  const participation = await supabase
    .from("house_poll_participation")
    .insert({ poll_id: params.pollId, apartment_id: params.apartmentId });

  if (participation.error) {
    if (uniqueViolation(participation.error)) return { ok: false, code: "APARTMENT_ALREADY_ANSWERED" };
    throw new Error(`P07 participation insert failed: ${participation.error.message}`);
  }

  if (answerRows.length > 0) {
    const answersResult = await supabase.from("house_poll_answers").insert(answerRows);
    if (answersResult.error) {
      await compensateParticipation(params.pollId, params.apartmentId);
      throw new Error(`P07 answers insert failed: ${answersResult.error.message}`);
    }
  }

  const metadata = poll.identity_mode === "open"
    ? { pollId: params.pollId, apartmentId: params.apartmentId, identityMode: poll.identity_mode }
    : { pollId: params.pollId, identityMode: poll.identity_mode };

  const history = await supabase.from("house_content_history").insert({
    actor_admin_id: null,
    actor_name: "Мешканець",
    actor_email: null,
    actor_role: "resident",
    house_id: params.houseId,
    entity_type: "house_poll",
    entity_id: params.pollId,
    action: "answers.submitted",
    description: `Мешканець відповів на опитування «${poll.title}».`,
    before_snapshot: null,
    after_snapshot: null,
    metadata,
  });
  if (history.error) console.error("P07 resident poll history write failed", { pollId: params.pollId, message: history.error.message });

  return { ok: true, code: "SUBMITTED", identityMode: poll.identity_mode };
}
