import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import type {
  HousePollIdentityMode,
  HousePollQuestionType,
} from "@/src/modules/content-engine/v2/handlers/polls";
import {
  buildAdminPollExportRows,
  serializeAdminPollExportCsv,
  type PollResultSource,
} from "@/src/modules/houses/services/pollResultsModel";

type PollRow = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  identity_mode: HousePollIdentityMode;
  results_visibility:
    | "immediate"
    | "after_completion"
    | "hidden";
  poll_status: "idle" | "active" | "completed";
};

export async function getAdminPollExport(params: {
  houseId: string;
  pollId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const pollResult = await supabase
    .from("house_polls")
    .select(
      "id,house_id,title,description,identity_mode,results_visibility,poll_status",
    )
    .eq("id", params.pollId)
    .eq("house_id", params.houseId)
    .maybeSingle();

  if (pollResult.error) {
    throw new Error(
      `P07 export poll lookup failed: ${pollResult.error.message}`,
    );
  }

  const poll = pollResult.data as PollRow | null;

  if (!poll) {
    return null;
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
      `P07 export questions read failed: ${questionsResult.error.message}`,
    );
  }

  const questions =
    (questionsResult.data ?? []) as Array<{
      id: string;
      poll_id: string;
      question: string;
      description: string;
      question_type: HousePollQuestionType;
      scale_max: 5 | 10 | null;
      sort_order: number;
    }>;

  const questionIds = questions.map(
    (question) => question.id,
  );

  const [answersResult, optionsResult] =
    await Promise.all([
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
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

  if (answersResult.error) {
    throw new Error(
      `P07 export answers read failed: ${answersResult.error.message}`,
    );
  }

  if (optionsResult.error) {
    throw new Error(
      `P07 export options read failed: ${optionsResult.error.message}`,
    );
  }

  const answers =
    (answersResult.data ?? []) as Array<{
      question_id: string;
      apartment_id: string | null;
      option_id: string | null;
      scale_value: number | null;
      bool_value: boolean | null;
      text_value: string | null;
    }>;

  let apartmentsById:
    | PollResultSource["apartmentsById"]
    | undefined;

  if (poll.identity_mode === "open") {
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
          `P07 export apartment read failed: ${apartmentsResult.error.message}`,
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

  const source: PollResultSource = {
    poll,
    questions,
    options:
      (optionsResult.data ?? []) as PollResultSource["options"],
    answers,
    participationApartmentIds: [],
    apartmentsById,
  };

  const rows = buildAdminPollExportRows(source);
  const csv = serializeAdminPollExportCsv({
    identityMode: poll.identity_mode,
    rows,
  });

  return {
    pollId: poll.id,
    title: poll.title,
    identityMode: poll.identity_mode,
    columns:
      poll.identity_mode === "anonymous"
        ? ["question", "questionType", "answer"]
        : [
            "apartmentLabel",
            "ownerName",
            "question",
            "questionType",
            "answer",
          ],
    rows,
    csv,
    filename: `poll-${poll.id}.csv`,
  };
}
