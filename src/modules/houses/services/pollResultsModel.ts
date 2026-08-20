import type {
  HousePollIdentityMode,
  HousePollQuestionType,
  HousePollResultsVisibility,
  HousePollStatus,
} from "@/src/modules/content-engine/v2/handlers/polls";

export type PollResultsViewer =
  | {
      kind: "admin";
    }
  | {
      kind: "resident";
      apartmentId: string;
    };

export type PollResultsVisibilityReason =
  | "RESPOND_FIRST"
  | "UNTIL_COMPLETION"
  | "HIDDEN"
  | null;

export type PollResultQuestion = {
  id: string;
  question: string;
  description: string;
  questionType: HousePollQuestionType;
  responseCount: number;
  options: Array<{
    id: string;
    label: string;
    count: number;
  }>;
  yesNo:
    | {
        yes: number;
        no: number;
      }
    | null;
  scale:
    | {
        max: 5 | 10;
        distribution: Array<{
          value: number;
          count: number;
        }>;
        average: number | null;
      }
    | null;
  freeText:
    | {
        count: number;
        responses: Array<{
          text: string;
          apartmentId: string | null;
          apartmentLabel: string | null;
          ownerName: string | null;
        }> | null;
      }
    | null;
};

export type PollResultsReadModel = {
  poll: {
    id: string;
    title: string;
    description: string;
    identityMode: HousePollIdentityMode;
    resultsVisibility: HousePollResultsVisibility;
    pollStatus: HousePollStatus;
  };
  hasResponded: boolean | null;
  participationCount: number | null;
  canViewResults: boolean;
  visibilityReason: PollResultsVisibilityReason;
  residentFreeTextNotice: string | null;
  questions: PollResultQuestion[];
};

export type PollResultSource = {
  poll: {
    id: string;
    title: string;
    description: string;
    identity_mode: HousePollIdentityMode;
    results_visibility: HousePollResultsVisibility;
    poll_status: HousePollStatus;
  };
  questions: Array<{
    id: string;
    question: string;
    description: string;
    question_type: HousePollQuestionType;
    scale_max: 5 | 10 | null;
    sort_order: number;
  }>;
  options: Array<{
    id: string;
    question_id: string;
    label: string;
    sort_order: number;
  }>;
  answers: Array<{
    question_id: string;
    apartment_id: string | null;
    option_id: string | null;
    scale_value: number | null;
    bool_value: boolean | null;
    text_value: string | null;
  }>;
  participationApartmentIds: string[];
  apartmentsById?: Record<
    string,
    {
      apartmentLabel: string;
      ownerName: string;
    }
  >;
};

export function resolveResidentResultsVisibility(params: {
  resultsVisibility: HousePollResultsVisibility;
  pollStatus: HousePollStatus;
  hasResponded: boolean;
}): {
  canViewResults: boolean;
  reason: PollResultsVisibilityReason;
} {
  if (params.resultsVisibility === "hidden") {
    return {
      canViewResults: false,
      reason: "HIDDEN",
    };
  }

  if (params.resultsVisibility === "after_completion") {
    return params.pollStatus === "completed"
      ? {
          canViewResults: true,
          reason: null,
        }
      : {
          canViewResults: false,
          reason: "UNTIL_COMPLETION",
        };
  }

  return params.hasResponded
    ? {
        canViewResults: true,
        reason: null,
      }
    : {
        canViewResults: false,
        reason: "RESPOND_FIRST",
      };
}

function buildQuestionResult(
  source: PollResultSource,
  question: PollResultSource["questions"][number],
  viewer: PollResultsViewer,
): PollResultQuestion {
  const answers = source.answers.filter(
    (answer) => answer.question_id === question.id,
  );

  const options = source.options
    .filter((option) => option.question_id === question.id)
    .sort(
      (left, right) =>
        left.sort_order - right.sort_order ||
        left.id.localeCompare(right.id),
    )
    .map((option) => ({
      id: option.id,
      label: option.label,
      count: answers.filter(
        (answer) => answer.option_id === option.id,
      ).length,
    }));

  const responseCount =
    question.question_type === "multiple_choice"
      ? new Set(
          answers.map((answer) => answer.apartment_id ?? answer.question_id),
        ).size
      : answers.length;

  const yesNo =
    question.question_type === "yes_no"
      ? {
          yes: answers.filter(
            (answer) => answer.bool_value === true,
          ).length,
          no: answers.filter(
            (answer) => answer.bool_value === false,
          ).length,
        }
      : null;

  const scaleValues =
    question.question_type === "scale"
      ? answers
          .map((answer) => answer.scale_value)
          .filter(
            (value): value is number =>
              typeof value === "number",
          )
      : [];

  const scale =
    question.question_type === "scale" &&
    (question.scale_max === 5 || question.scale_max === 10)
      ? {
          max: question.scale_max,
          distribution: Array.from(
            { length: question.scale_max },
            (_, index) => ({
              value: index + 1,
              count: scaleValues.filter(
                (value) => value === index + 1,
              ).length,
            }),
          ),
          average:
            scaleValues.length > 0
              ? scaleValues.reduce(
                  (sum, value) => sum + value,
                  0,
                ) / scaleValues.length
              : null,
        }
      : null;

  const freeTextAnswers =
    question.question_type === "free_text"
      ? answers.filter(
          (answer) =>
            typeof answer.text_value === "string" &&
            answer.text_value.trim(),
        )
      : [];

  const freeText =
    question.question_type === "free_text"
      ? {
          count: freeTextAnswers.length,
          responses:
            viewer.kind === "admin"
              ? freeTextAnswers.map((answer) => {
                  const apartment =
                    answer.apartment_id
                      ? source.apartmentsById?.[
                          answer.apartment_id
                        ]
                      : undefined;

                  return {
                    text: answer.text_value!.trim(),
                    apartmentId: answer.apartment_id,
                    apartmentLabel:
                      source.poll.identity_mode === "open"
                        ? apartment?.apartmentLabel ?? null
                        : null,
                    ownerName:
                      source.poll.identity_mode === "open"
                        ? apartment?.ownerName ?? null
                        : null,
                  };
                })
              : null,
        }
      : null;

  return {
    id: question.id,
    question: question.question,
    description: question.description,
    questionType: question.question_type,
    responseCount,
    options,
    yesNo,
    scale,
    freeText,
  };
}

export function buildPollResultsReadModel(params: {
  source: PollResultSource;
  viewer: PollResultsViewer;
}): PollResultsReadModel {
  const { source, viewer } = params;

  const hasResponded =
    viewer.kind === "resident"
      ? source.participationApartmentIds.includes(
          viewer.apartmentId,
        )
      : null;

  const visibility =
    viewer.kind === "admin"
      ? {
          canViewResults: true,
          reason: null as PollResultsVisibilityReason,
        }
      : resolveResidentResultsVisibility({
          resultsVisibility:
            source.poll.results_visibility,
          pollStatus: source.poll.poll_status,
          hasResponded: hasResponded === true,
        });

  const questions = visibility.canViewResults
    ? [...source.questions]
        .sort(
          (left, right) =>
            left.sort_order - right.sort_order ||
            left.id.localeCompare(right.id),
        )
        .map((question) =>
          buildQuestionResult(source, question, viewer),
        )
    : [];

  return {
    poll: {
      id: source.poll.id,
      title: source.poll.title,
      description: source.poll.description,
      identityMode: source.poll.identity_mode,
      resultsVisibility:
        source.poll.results_visibility,
      pollStatus: source.poll.poll_status,
    },
    hasResponded,
    participationCount: visibility.canViewResults
      ? source.participationApartmentIds.length
      : null,
    canViewResults: visibility.canViewResults,
    visibilityReason: visibility.reason,
    residentFreeTextNotice:
      viewer.kind === "resident" &&
      visibility.canViewResults &&
      source.questions.some(
        (question) =>
          question.question_type === "free_text",
      )
        ? "Текстові відповіді мешканців не публікуються. Відображається лише їх кількість."
        : null,
    questions,
  };
}

export type PollExportRow = {
  apartmentLabel?: string;
  ownerName?: string;
  question: string;
  questionType: HousePollQuestionType;
  answer: string;
};

export function buildAdminPollExportRows(
  source: PollResultSource,
): PollExportRow[] {
  const questionById = new Map(
    source.questions.map((question) => [
      question.id,
      question,
    ]),
  );

  const optionById = new Map(
    source.options.map((option) => [
      option.id,
      option,
    ]),
  );

  return source.answers.flatMap((answer) => {
    const question = questionById.get(answer.question_id);

    if (!question) {
      return [];
    }

    let value = "";

    if (answer.option_id) {
      value =
        optionById.get(answer.option_id)?.label ?? "";
    } else if (
      typeof answer.scale_value === "number"
    ) {
      value = String(answer.scale_value);
    } else if (
      typeof answer.bool_value === "boolean"
    ) {
      value = answer.bool_value ? "Так" : "Ні";
    } else if (answer.text_value) {
      value = answer.text_value.trim();
    }

    if (!value) {
      return [];
    }

    if (source.poll.identity_mode === "anonymous") {
      return [
        {
          question: question.question,
          questionType: question.question_type,
          answer: value,
        },
      ];
    }

    const apartment =
      answer.apartment_id
        ? source.apartmentsById?.[
            answer.apartment_id
          ]
        : undefined;

    return [
      {
        apartmentLabel:
          apartment?.apartmentLabel ?? "",
        ownerName: apartment?.ownerName ?? "",
        question: question.question,
        questionType: question.question_type,
        answer: value,
      },
    ];
  });
}

function protectCsvCell(value: string) {
  return /^[=+\-@]/.test(value)
    ? `'${value}`
    : value;
}

function csvCell(value: string) {
  const protectedValue = protectCsvCell(value);
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export function serializeAdminPollExportCsv(params: {
  identityMode: HousePollIdentityMode;
  rows: PollExportRow[];
}) {
  const headers =
    params.identityMode === "anonymous"
      ? ["Питання", "Тип", "Відповідь"]
      : [
          "Квартира",
          "Власник",
          "Питання",
          "Тип",
          "Відповідь",
        ];

  const lines = [
    headers.map(csvCell).join(","),
    ...params.rows.map((row) => {
      const cells =
        params.identityMode === "anonymous"
          ? [
              row.question,
              row.questionType,
              row.answer,
            ]
          : [
              row.apartmentLabel ?? "",
              row.ownerName ?? "",
              row.question,
              row.questionType,
              row.answer,
            ];

      return cells.map(csvCell).join(",");
    }),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
