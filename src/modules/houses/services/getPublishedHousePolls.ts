import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HousePollIdentityMode,
  HousePollQuestionType,
  HousePollResultsVisibility,
  HousePollStatus,
} from "@/src/modules/content-engine/v2/handlers/polls";
import {
  throwRequiredPublicReadError,
} from "@/src/modules/houses/services/publicContentResilience";

export type PublishedPollOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type PublishedPollQuestion = {
  id: string;
  question: string;
  description: string;
  questionType: HousePollQuestionType;
  scaleMax: 5 | 10 | null;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  isRequired: boolean;
  sortOrder: number;
  options: PublishedPollOption[];
};

export type PublishedHousePoll = {
  id: string;
  title: string;
  description: string;
  identityMode: HousePollIdentityMode;
  resultsVisibility: HousePollResultsVisibility;
  pollStatus: HousePollStatus;
  publishedAt: string | null;
  updatedAt: string;
  questions: PublishedPollQuestion[];
};

type PollRow = {
  id: string;
  title: string;
  description: string;
  identity_mode: HousePollIdentityMode;
  results_visibility: HousePollResultsVisibility;
  poll_status: HousePollStatus;
  published_at: string | null;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  poll_id: string;
  question: string;
  description: string;
  question_type: HousePollQuestionType;
  scale_max: 5 | 10 | null;
  scale_min_label: string | null;
  scale_max_label: string | null;
  is_required: boolean;
  sort_order: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  label: string;
  sort_order: number;
};

async function loadPublishedHousePolls(
  houseId: string,
): Promise<PublishedHousePoll[]> {
  const supabase = createSupabasePublicClient();

  const pollsResult = await supabase
    .from("house_polls")
    .select(
      "id,title,description,identity_mode,results_visibility,poll_status,published_at,updated_at",
    )
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("updated_at", { ascending: false });

  if (pollsResult.error) {
    throwRequiredPublicReadError({
      section: "polls",
      resource: "house_polls",
      houseId,
      error: pollsResult.error,
    });
  }

  const polls = (pollsResult.data ?? []) as PollRow[];
  const pollIds = polls.map((poll) => poll.id);

  if (pollIds.length === 0) {
    return [];
  }

  const questionsResult = await supabase
    .from("house_poll_questions")
    .select(
      "id,poll_id,question,description,question_type,scale_max,scale_min_label,scale_max_label,is_required,sort_order",
    )
    .in("poll_id", pollIds)
    .order("sort_order", { ascending: true });

  if (questionsResult.error) {
    throwRequiredPublicReadError({
      section: "polls",
      resource: "house_poll_questions",
      houseId,
      error: questionsResult.error,
    });
  }

  const questions = (questionsResult.data ?? []) as QuestionRow[];
  const questionIds = questions.map((question) => question.id);

  let options: OptionRow[] = [];

  if (questionIds.length > 0) {
    const optionsResult = await supabase
      .from("house_poll_options")
      .select("id,question_id,label,sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (optionsResult.error) {
      throwRequiredPublicReadError({
        section: "polls",
        resource: "house_poll_options",
        houseId,
        error: optionsResult.error,
      });
    }

    options = (optionsResult.data ?? []) as OptionRow[];
  }

  return polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    identityMode: poll.identity_mode,
    resultsVisibility: poll.results_visibility,
    pollStatus: poll.poll_status,
    publishedAt: poll.published_at,
    updatedAt: poll.updated_at,
    questions: questions
      .filter((question) => question.poll_id === poll.id)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((question) => ({
        id: question.id,
        question: question.question,
        description: question.description,
        questionType: question.question_type,
        scaleMax: question.scale_max,
        scaleMinLabel: question.scale_min_label ?? "",
        scaleMaxLabel: question.scale_max_label ?? "",
        isRequired: question.is_required,
        sortOrder: question.sort_order,
        options: options
          .filter((option) => option.question_id === question.id)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((option) => ({
            id: option.id,
            label: option.label,
            sortOrder: option.sort_order,
          })),
      })),
  }));
}

export const getPublishedHousePolls = cache(
  async (houseId: string): Promise<PublishedHousePoll[]> => {
    return unstable_cache(
      () => loadPublishedHousePolls(houseId),
      ["published-house-polls-v1", houseId],
      {
        tags: [`house:${houseId}:polls`, `house:${houseId}`],
        revalidate: 60,
      },
    )();
  },
);
