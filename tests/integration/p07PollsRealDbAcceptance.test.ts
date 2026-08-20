import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { submitPollAnswersDb } from "../../src/modules/houses/resident/pollsRepository";
import { getAdminPollExport } from "../../src/modules/houses/services/getAdminPollExport";
import { getPollResults } from "../../src/modules/houses/services/getPollResults";

const enabled = process.env.RUN_P07_REAL_DB === "1";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Fixture = {
  houseId: string;
  apartmentId: string;
  openPollId: string;
  anonymousPollId: string;
  questions: {
    single: string;
    multiple: string;
    yesNo: string;
    scale: string;
    text: string;
  };
  options: {
    single: string;
    multipleA: string;
    multipleB: string;
  };
};

const suite = enabled ? describe : describe.skip;

suite("P07 T8 real database acceptance", () => {
  if (!url || !serviceRoleKey || !anonKey) {
    throw new Error(
      "RUN_P07_REAL_DB requires local Supabase URL, service-role key and anon key",
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const anon = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let fixture: Fixture;
  let createdTemporaryApartment = false;

  async function createPoll(params: {
    houseId: string;
    identityMode: "open" | "anonymous";
    suffix: string;
  }) {
    const pollInsert = await admin
      .from("house_polls")
      .insert({
        house_id: params.houseId,
        title: `P07 T8 ${params.suffix}`,
        description: "Temporary T8 real DB acceptance fixture",
        identity_mode: params.identityMode,
        results_visibility: "immediate",
        poll_status: "active",
        lifecycle_status: "published",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (pollInsert.error || !pollInsert.data?.id) {
      throw new Error(
        `Unable to create T8 poll: ${pollInsert.error?.message ?? "missing id"}`,
      );
    }

    const pollId = pollInsert.data.id as string;

    const questionRows = [
      {
        poll_id: pollId,
        question: "Single",
        description: "",
        question_type: "single_choice",
        scale_max: null,
        is_required: true,
        sort_order: 0,
      },
      {
        poll_id: pollId,
        question: "Multiple",
        description: "",
        question_type: "multiple_choice",
        scale_max: null,
        is_required: true,
        sort_order: 1,
      },
      {
        poll_id: pollId,
        question: "Yes/no",
        description: "",
        question_type: "yes_no",
        scale_max: null,
        is_required: true,
        sort_order: 2,
      },
      {
        poll_id: pollId,
        question: "Scale",
        description: "",
        question_type: "scale",
        scale_max: 5,
        scale_min_label: "Min",
        scale_max_label: "Max",
        is_required: true,
        sort_order: 3,
      },
      {
        poll_id: pollId,
        question: "Text",
        description: "",
        question_type: "free_text",
        scale_max: null,
        is_required: true,
        sort_order: 4,
      },
    ];

    const questionInsert = await admin
      .from("house_poll_questions")
      .insert(questionRows)
      .select("id,question_type");

    if (questionInsert.error) {
      throw new Error(
        `Unable to create T8 questions: ${questionInsert.error.message}`,
      );
    }

    const byType = new Map(
      (questionInsert.data ?? []).map((row) => [
        row.question_type as string,
        row.id as string,
      ]),
    );

    const single = byType.get("single_choice");
    const multiple = byType.get("multiple_choice");
    const yesNo = byType.get("yes_no");
    const scale = byType.get("scale");
    const text = byType.get("free_text");

    if (!single || !multiple || !yesNo || !scale || !text) {
      throw new Error("T8 question ids incomplete");
    }

    const optionInsert = await admin
      .from("house_poll_options")
      .insert([
        {
          question_id: single,
          label: "Single A",
          sort_order: 0,
        },
        {
          question_id: single,
          label: "Single B",
          sort_order: 1,
        },
        {
          question_id: multiple,
          label: "Multiple A",
          sort_order: 0,
        },
        {
          question_id: multiple,
          label: "Multiple B",
          sort_order: 1,
        },
      ])
      .select("id,question_id,label");

    if (optionInsert.error) {
      throw new Error(
        `Unable to create T8 options: ${optionInsert.error.message}`,
      );
    }

    const singleOption = optionInsert.data?.find(
      (row) =>
        row.question_id === single &&
        row.label === "Single A",
    )?.id as string | undefined;

    const multipleA = optionInsert.data?.find(
      (row) =>
        row.question_id === multiple &&
        row.label === "Multiple A",
    )?.id as string | undefined;

    const multipleB = optionInsert.data?.find(
      (row) =>
        row.question_id === multiple &&
        row.label === "Multiple B",
    )?.id as string | undefined;

    if (!singleOption || !multipleA || !multipleB) {
      throw new Error("T8 option ids incomplete");
    }

    return {
      pollId,
      questions: {
        single,
        multiple,
        yesNo,
        scale,
        text,
      },
      options: {
        single: singleOption,
        multipleA,
        multipleB,
      },
    };
  }

  function answersFor(
    questions: Fixture["questions"],
    options: Fixture["options"],
  ) {
    return [
      {
        questionId: questions.single,
        optionId: options.single,
      },
      {
        questionId: questions.multiple,
        optionIds: [
          options.multipleA,
          options.multipleB,
        ],
      },
      {
        questionId: questions.yesNo,
        value: true,
      },
      {
        questionId: questions.scale,
        value: 4,
      },
      {
        questionId: questions.text,
        value: "T8 resident answer",
      },
    ];
  }

  beforeAll(async () => {
    const houseLookup = await admin
      .from("houses")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (houseLookup.error || !houseLookup.data?.id) {
      throw new Error(
        "T8 requires one existing local houses row. No house fixture is created.",
      );
    }

    const houseId = houseLookup.data.id as string;
    let apartmentId: string;

    const apartmentLookup = await admin
      .from("house_apartments")
      .select("id")
      .eq("house_id", houseId)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (apartmentLookup.error) {
      throw new Error(
        `Unable to inspect T8 apartment fixture: ${apartmentLookup.error.message}`,
      );
    }

    if (apartmentLookup.data?.id) {
      apartmentId = apartmentLookup.data.id as string;
    } else {
      const fixtureToken = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const apartmentInsert = await admin
        .from("house_apartments")
        .insert({
          house_id: houseId,
          account_number: `P07-T8-${fixtureToken}`,
          apartment_label: `T8-${fixtureToken}`,
          owner_name: "P07 T8 Temporary Fixture",
          source_type: "manual",
        })
        .select("id")
        .single();

      if (apartmentInsert.error || !apartmentInsert.data?.id) {
        throw new Error(
          `Unable to create temporary T8 apartment: ${apartmentInsert.error?.message ?? "missing id"}`,
        );
      }

      apartmentId = apartmentInsert.data.id as string;
      createdTemporaryApartment = true;
    }

    const open = await createPoll({
      houseId,
      identityMode: "open",
      suffix: "open race",
    });

    const anonymous = await createPoll({
      houseId,
      identityMode: "anonymous",
      suffix: "anonymous",
    });

    fixture = {
      houseId,
      apartmentId,
      openPollId: open.pollId,
      anonymousPollId: anonymous.pollId,
      questions: open.questions,
      options: open.options,
    };

    (fixture as Fixture & {
      anonymousQuestions?: Fixture["questions"];
      anonymousOptions?: Fixture["options"];
    }).anonymousQuestions = anonymous.questions;

    (fixture as Fixture & {
      anonymousQuestions?: Fixture["questions"];
      anonymousOptions?: Fixture["options"];
    }).anonymousOptions = anonymous.options;
  }, 30_000);

  afterAll(async () => {
    if (!fixture) return;

    await admin
      .from("house_polls")
      .delete()
      .in("id", [
        fixture.openPollId,
        fixture.anonymousPollId,
      ]);

    if (createdTemporaryApartment) {
      await admin
        .from("house_apartments")
        .delete()
        .eq("id", fixture.apartmentId);
    }
  }, 30_000);

  it("accepts exactly one of two concurrent submits from the same apartment", async () => {
    const answers = answersFor(
      fixture.questions,
      fixture.options,
    );

    const [left, right] = await Promise.all([
      submitPollAnswersDb({
        houseId: fixture.houseId,
        pollId: fixture.openPollId,
        apartmentId: fixture.apartmentId,
        answers,
      }),
      submitPollAnswersDb({
        houseId: fixture.houseId,
        pollId: fixture.openPollId,
        apartmentId: fixture.apartmentId,
        answers,
      }),
    ]);

    const results = [left, right];

    expect(
      results.filter((result) => result.ok),
    ).toHaveLength(1);

    expect(
      results.filter(
        (result) =>
          !result.ok &&
          result.code === "APARTMENT_ALREADY_ANSWERED",
      ),
    ).toHaveLength(1);

    const participation = await admin
      .from("house_poll_participation")
      .select("poll_id,apartment_id", {
        count: "exact",
      })
      .eq("poll_id", fixture.openPollId)
      .eq("apartment_id", fixture.apartmentId);

    expect(participation.error).toBeNull();
    expect(participation.count).toBe(1);

    const answerRows = await admin
      .from("house_poll_answers")
      .select("id", {
        count: "exact",
      })
      .eq("poll_id", fixture.openPollId);

    expect(answerRows.error).toBeNull();
    expect(answerRows.count).toBe(6);
  }, 30_000);

  it("stores anonymous answers with no apartment_id and exports no apartment identity", async () => {
    const extended = fixture as Fixture & {
      anonymousQuestions: Fixture["questions"];
      anonymousOptions: Fixture["options"];
    };

    const submit = await submitPollAnswersDb({
      houseId: fixture.houseId,
      pollId: fixture.anonymousPollId,
      apartmentId: fixture.apartmentId,
      answers: answersFor(
        extended.anonymousQuestions,
        extended.anonymousOptions,
      ),
    });

    expect(submit).toMatchObject({
      ok: true,
      code: "SUBMITTED",
      identityMode: "anonymous",
    });

    const answerRows = await admin
      .from("house_poll_answers")
      .select("apartment_id")
      .eq("poll_id", fixture.anonymousPollId);

    expect(answerRows.error).toBeNull();
    expect(answerRows.data).toHaveLength(6);
    expect(
      (answerRows.data ?? []).every(
        (row) => row.apartment_id === null,
      ),
    ).toBe(true);

    const exportData = await getAdminPollExport({
      houseId: fixture.houseId,
      pollId: fixture.anonymousPollId,
    });

    expect(exportData).not.toBeNull();
    expect(exportData?.identityMode).toBe("anonymous");
    expect(exportData?.csv).not.toContain("Квартира");
    expect(exportData?.csv).not.toContain("Власник");

    for (const row of exportData?.rows ?? []) {
      expect(
        Object.prototype.hasOwnProperty.call(
          row,
          "apartmentLabel",
        ),
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(
          row,
          "ownerName",
        ),
      ).toBe(false);
    }

    const adminResults = await getPollResults({
      houseId: fixture.houseId,
      pollId: fixture.anonymousPollId,
      viewer: { kind: "admin" },
    });

    const freeText = adminResults?.questions.find(
      (question) =>
        question.questionType === "free_text",
    );

    for (const response of freeText?.freeText?.responses ?? []) {
      expect(response.apartmentId).toBeNull();
      expect(response.apartmentLabel).toBeNull();
      expect(response.ownerName).toBeNull();
    }
  }, 30_000);

  it("denies anon direct reads of answers and participation", async () => {
    const answersRead = await anon
      .from("house_poll_answers")
      .select("id")
      .eq("poll_id", fixture.anonymousPollId);

    const participationRead = await anon
      .from("house_poll_participation")
      .select("poll_id,apartment_id")
      .eq("poll_id", fixture.anonymousPollId);

    const assertNoAnonRows = (
      result: {
        data: unknown[] | null;
        error: { code?: string; message?: string } | null;
      },
    ) => {
      if (result.error) {
        expect(
          result.error.code === "42501" ||
            /permission denied/i.test(result.error.message ?? ""),
        ).toBe(true);
        return;
      }

      expect(result.data ?? []).toHaveLength(0);
    };

    assertNoAnonRows(answersRead);
    assertNoAnonRows(participationRead);
  }, 30_000);

  it("rejects not-active and foreign-house apartment submissions", async () => {
    const extended = fixture as Fixture & {
      anonymousQuestions: Fixture["questions"];
      anonymousOptions: Fixture["options"];
    };

    const close = await admin
      .from("house_polls")
      .update({
        poll_status: "completed",
      })
      .eq("id", fixture.anonymousPollId);

    expect(close.error).toBeNull();

    const notActive = await submitPollAnswersDb({
      houseId: fixture.houseId,
      pollId: fixture.anonymousPollId,
      apartmentId: fixture.apartmentId,
      answers: answersFor(
        extended.anonymousQuestions,
        extended.anonymousOptions,
      ),
    });

    expect(notActive).toEqual({
      ok: false,
      code: "POLL_NOT_ACTIVE",
    });

    const otherApartment = await admin
      .from("house_apartments")
      .select("id,house_id")
      .neq("house_id", fixture.houseId)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();

    if (otherApartment.data?.id) {
      const foreign = await submitPollAnswersDb({
        houseId: fixture.houseId,
        pollId: fixture.openPollId,
        apartmentId: otherApartment.data.id,
        answers: answersFor(
          fixture.questions,
          fixture.options,
        ),
      });

      expect(foreign).toEqual({
        ok: false,
        code: "APARTMENT_INVALID",
      });
    }
  }, 30_000);
});
