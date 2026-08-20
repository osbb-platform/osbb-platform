import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import type {
  HousePollIdentityMode,
  HousePollQuestionType,
  HousePollResultsVisibility,
  HousePollStatus,
} from "@/src/modules/content-engine/v2/handlers/polls";
import {
  buildPollResultsReadModel,
  type PollResultSource,
  type PollResultsReadModel,
  type PollResultsViewer,
} from "@/src/modules/houses/services/pollResultsModel";

type PollRow = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  identity_mode: HousePollIdentityMode;
  results_visibility: HousePollResultsVisibility;
  poll_status: HousePollStatus;
  lifecycle_status: "draft" | "published" | "archived";
};

type QuestionRow = {
  id: string;
  poll_id: string;
  question: string;
  description: string;
  question_type: HousePollQuestionType;
  scale_max: 5 | 10 | null;
  sort_order: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

type AnswerRow = {
  question_id: string;
  apartment_id: string | null;
  option_id: string | null;
  scale_value: number | null;
  bool_value: boolean | null;
  text_value: string | null;
};

export async function getPollResults(params: {
  houseId: string;
  pollId: string;
  viewer: PollResultsViewer;
}): Promise<PollResultsReadModel | null> {
  const supabase = createSupabaseAdminClient();

  const pollResult = await supabase
    .from("house_polls")
    .select(
      "id,house_id,title,description,identity_mode,results_visibility,poll_status,lifecycle_status",
    )
    .eq("id", params.pollId)
    .eq("house_id", params.houseId)
    .maybeSingle();

  if (pollResult.error) {
    throw new Error(
      `P07 results poll lookup failed: ${pollResult.error.message}`,
    );
  }

  const poll = pollResult.data as PollRow | null;

  if (!poll) {
    return null;
  }

  if (
    params.viewer.kind === "resident" &&
    poll.lifecycle_status !== "published"
  ) {
    return null;
  }

  if (params.viewer.kind === "resident") {
    const apartmentResult = await supabase
      .from("house_apartments")
      .select("id")
      .eq("id", params.viewer.apartmentId)
      .eq("house_id", params.houseId)
      .is("archived_at", null)
      .maybeSingle();

    if (apartmentResult.error) {
      throw new Error(
        `P07 results apartment lookup failed: ${apartmentResult.error.message}`,
      );
    }

    if (!apartmentResult.data) {
      return null;
    }
  }

  const questionsResult = await supabase
    .from("house_poll_questions")
    .select(
      "id,poll_id,question,description,question_type,scale_max,sort_order",
    )
    .eq("poll_id", params.pollId)
    .order("sort_order", { ascending: true });

  if (questionsResult.error) {
    throw new Error(
      `P07 results questions lookup failed: ${questionsResult.error.message}`,
    );
  }

  const questions =
    (questionsResult.data ?? []) as QuestionRow[];
  const questionIds = questions.map(
    (question) => question.id,
  );

  const [
    participationResult,
    answersResult,
    optionsResult,
  ] = await Promise.all([
    supabase
      .from("house_poll_participation")
      .select("apartment_id")
      .eq("poll_id", params.pollId),
    supabase
      .from("house_poll_answers")
      .select(
        "question_id,apartment_id,option_id,scale_value,bool_value,text_value",
      )
      .eq("poll_id", params.pollId),
    questionIds.length > 0
      ? supabase
          .from("house_poll_options")
          .select(
            "id,question_id,label,sort_order",
          )
          .in("question_id", questionIds)
          .order("sort_order", {
            ascending: true,
          })
      : Promise.resolve({
          data: [] as OptionRow[],
          error: null,
        }),
  ]);

  if (participationResult.error) {
    throw new Error(
      `P07 results participation read failed: ${participationResult.error.message}`,
    );
  }

  if (answersResult.error) {
    throw new Error(
      `P07 results answers read failed: ${answersResult.error.message}`,
    );
  }

  if (optionsResult.error) {
    throw new Error(
      `P07 results options read failed: ${optionsResult.error.message}`,
    );
  }

  const answers =
    (answersResult.data ?? []) as AnswerRow[];

  let apartmentsById:
    | PollResultSource["apartmentsById"]
    | undefined;

  if (
    params.viewer.kind === "admin" &&
    poll.identity_mode === "open"
  ) {
    const apartmentIds = Array.from(
      new Set(
        answers
          .map((answer) => answer.apartment_id)
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              value.length > 0,
          ),
      ),
    );

    if (apartmentIds.length > 0) {
      const apartmentsResult = await supabase
        .from("house_apartments")
        .select("id,apartment_label,owner_name")
        .eq("house_id", params.houseId)
        .in("id", apartmentIds);

      if (apartmentsResult.error) {
        throw new Error(
          `P07 results apartment labels read failed: ${apartmentsResult.error.message}`,
        );
      }

      apartmentsById = Object.fromEntries(
        (apartmentsResult.data ?? []).map(
          (apartment) => [
            apartment.id,
            {
              apartmentLabel:
                apartment.apartment_label,
              ownerName: apartment.owner_name,
            },
          ],
        ),
      );
    }
  }

  return buildPollResultsReadModel({
    viewer: params.viewer,
    source: {
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        identity_mode: poll.identity_mode,
        results_visibility:
          poll.results_visibility,
        poll_status: poll.poll_status,
      },
      questions,
      options:
        (optionsResult.data ?? []) as OptionRow[],
      answers,
      participationApartmentIds:
        (participationResult.data ?? []).map(
          (row) => row.apartment_id,
        ),
      apartmentsById,
    },
  });
}
