import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HousePollIdentityMode,
  HousePollQuestionType,
  HousePollResultsVisibility,
  HousePollStatus,
} from "@/src/modules/content-engine/v2/handlers/polls";
import { getPollResults } from "@/src/modules/houses/services/getPollResults";
import type { PollResultsReadModel } from "@/src/modules/houses/services/pollResultsModel";
import { getAdminPollExport } from "@/src/modules/houses/services/getAdminPollExport";

type PollLifecycleStatus = "draft" | "published" | "archived";

type PollRow = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  identity_mode: HousePollIdentityMode;
  results_visibility: HousePollResultsVisibility;
  poll_status: HousePollStatus;
  lifecycle_status: PollLifecycleStatus;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
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

export type AdminPollOptionSnapshot = {
  id: string;
  label: string;
  sortOrder: number;
};

export type AdminPollQuestionSnapshot = {
  id: string;
  question: string;
  description: string;
  questionType: HousePollQuestionType;
  scaleMax: 5 | 10 | null;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  isRequired: boolean;
  sortOrder: number;
  options: AdminPollOptionSnapshot[];
};

export type AdminPollExportSnapshot = {
  identityMode: HousePollIdentityMode;
  columns: string[];
  rows: Array<Record<string, string>>;
  csv: string;
  filename: string;
};

export type AdminHousePollSnapshot = {
  id: string;
  title: string;
  description: string;
  identityMode: HousePollIdentityMode;
  resultsVisibility: HousePollResultsVisibility;
  pollStatus: HousePollStatus;
  lifecycleStatus: PollLifecycleStatus;
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  questions: AdminPollQuestionSnapshot[];
  results: PollResultsReadModel | null;
  exportData: AdminPollExportSnapshot | null;
};

export type AdminHousePollsSnapshot = {
  items: AdminHousePollSnapshot[];
  updatedAt: string | null;
};

export async function getAdminHousePolls(params: {
  houseId: string;
}): Promise<AdminHousePollsSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const pollsResult = await supabase
    .from("house_polls")
    .select(
      [
        "id",
        "house_id",
        "title",
        "description",
        "identity_mode",
        "results_visibility",
        "poll_status",
        "lifecycle_status",
        "lock_version",
        "created_at",
        "updated_at",
        "published_at",
        "archived_at",
      ].join(","),
    )
    .eq("house_id", params.houseId)
    .order("updated_at", { ascending: false });

  if (pollsResult.error) {
    throw new Error(`Failed to load admin house polls: ${pollsResult.error.message}`);
  }

  const polls = (pollsResult.data ?? []) as unknown as PollRow[];

  if (polls.length === 0) {
    return { items: [], updatedAt: null };
  }

  const pollIds = polls.map((poll) => poll.id);

  const questionsResult = await supabase
    .from("house_poll_questions")
    .select(
      [
        "id",
        "poll_id",
        "question",
        "description",
        "question_type",
        "scale_max",
        "scale_min_label",
        "scale_max_label",
        "is_required",
        "sort_order",
      ].join(","),
    )
    .in("poll_id", pollIds)
    .order("sort_order", { ascending: true });

  if (questionsResult.error) {
    throw new Error(`Failed to load admin poll questions: ${questionsResult.error.message}`);
  }

  const questions = (questionsResult.data ?? []) as unknown as QuestionRow[];
  const questionIds = questions.map((question) => question.id);
  let options: OptionRow[] = [];

  if (questionIds.length > 0) {
    const optionsResult = await supabase
      .from("house_poll_options")
      .select("id,question_id,label,sort_order")
      .in("question_id", questionIds)
      .order("sort_order", { ascending: true });

    if (optionsResult.error) {
      throw new Error(`Failed to load admin poll options: ${optionsResult.error.message}`);
    }

    options = (optionsResult.data ?? []) as unknown as OptionRow[];
  }

  const items = await Promise.all(
    polls.map(async (poll): Promise<AdminHousePollSnapshot> => {
      const pollQuestions = questions
        .filter((question) => question.poll_id === poll.id)
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((question): AdminPollQuestionSnapshot => ({
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
        }));

      const [results, exportData] = await Promise.all([
        getPollResults({
          houseId: params.houseId,
          pollId: poll.id,
          viewer: { kind: "admin" },
        }),
        getAdminPollExport({
          houseId: params.houseId,
          pollId: poll.id,
        }),
      ]);

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        identityMode: poll.identity_mode,
        resultsVisibility: poll.results_visibility,
        pollStatus: poll.poll_status,
        lifecycleStatus: poll.lifecycle_status,
        lockVersion: poll.lock_version,
        createdAt: poll.created_at,
        updatedAt: poll.updated_at,
        publishedAt: poll.published_at,
        archivedAt: poll.archived_at,
        questions: pollQuestions,
        results,
        exportData: exportData
          ? {
              identityMode: exportData.identityMode,
              columns: exportData.columns,
              rows: exportData.rows,
              csv: exportData.csv,
              filename: exportData.filename,
            }
          : null,
      };
    }),
  );

  return {
    items,
    updatedAt: items.map((item) => item.updatedAt).sort().at(-1) ?? null,
  };
}
