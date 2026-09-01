import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
  let foreignApartmentId = "";
  const createdHouseIds: string[] = [];
  const createdApartmentIds: string[] = [];
  const createdPollIds: string[] = [];

  async function createPoll(params: {
    houseId: string;
    identityMode: "open" | "anonymous";
    suffix: string;
    scaleMax?: 5 | 10;
    resultsVisibility?:
      | "immediate"
      | "after_completion"
      | "hidden";
  }) {
    const pollInsert = await admin
      .from("house_polls")
      .insert({
        house_id: params.houseId,
        title: `P07 T8 ${params.suffix}`,
        description: "Temporary T8 real DB acceptance fixture",
        identity_mode: params.identityMode,
        results_visibility:
          params.resultsVisibility ?? "immediate",
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
    createdPollIds.push(pollId);

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
        scale_max: params.scaleMax ?? 5,
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
    const managementCompanyLookup = await admin
      .from("management_companies")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (
      managementCompanyLookup.error ||
      !managementCompanyLookup.data?.id
    ) {
      throw new Error(
        "T8 requires one local management_companies row for temporary house fixtures.",
      );
    }

    const managementCompanyId =
      managementCompanyLookup.data.id as string;
    const fixtureToken =
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const housesInsert = await admin
      .from("houses")
      .insert([
        {
          management_company_id: managementCompanyId,
          name: `P07 T2 Primary ${fixtureToken}`,
          slug: `p07-t2-primary-${fixtureToken}`,
          address: `P07 T2 Primary ${fixtureToken}`,
          is_active: true,
        },
        {
          management_company_id: managementCompanyId,
          name: `P07 T2 Foreign ${fixtureToken}`,
          slug: `p07-t2-foreign-${fixtureToken}`,
          address: `P07 T2 Foreign ${fixtureToken}`,
          is_active: true,
        },
      ])
      .select("id,slug");

    if (
      housesInsert.error ||
      (housesInsert.data ?? []).length !== 2
    ) {
      throw new Error(
        `Unable to create T8 temporary houses: ${housesInsert.error?.message ?? "unexpected row count"}`,
      );
    }

    const primaryHouse = housesInsert.data?.find(
      (row) => row.slug === `p07-t2-primary-${fixtureToken}`,
    );
    const foreignHouse = housesInsert.data?.find(
      (row) => row.slug === `p07-t2-foreign-${fixtureToken}`,
    );

    if (!primaryHouse?.id || !foreignHouse?.id) {
      throw new Error("T8 temporary house ids incomplete");
    }

    const houseId = primaryHouse.id as string;
    const foreignHouseId = foreignHouse.id as string;

    createdHouseIds.push(houseId, foreignHouseId);

    const apartmentsInsert = await admin
      .from("house_apartments")
      .insert([
        {
          house_id: houseId,
          account_number: `P07-T2-PRIMARY-${fixtureToken}`,
          apartment_label: `T2-P-${fixtureToken}`,
          owner_name: "P07 T2 Primary Resident",
          source_type: "manual",
        },
        {
          house_id: foreignHouseId,
          account_number: `P07-T2-FOREIGN-${fixtureToken}`,
          apartment_label: `T2-F-${fixtureToken}`,
          owner_name: "P07 T2 Foreign Resident",
          source_type: "manual",
        },
      ])
      .select("id,house_id");

    if (
      apartmentsInsert.error ||
      (apartmentsInsert.data ?? []).length !== 2
    ) {
      throw new Error(
        `Unable to create T8 temporary apartments: ${apartmentsInsert.error?.message ?? "unexpected row count"}`,
      );
    }

    const primaryApartment = apartmentsInsert.data?.find(
      (row) => row.house_id === houseId,
    );
    const foreignApartment = apartmentsInsert.data?.find(
      (row) => row.house_id === foreignHouseId,
    );

    if (!primaryApartment?.id || !foreignApartment?.id) {
      throw new Error("T8 temporary apartment ids incomplete");
    }

    const apartmentId = primaryApartment.id as string;
    foreignApartmentId = foreignApartment.id as string;

    createdApartmentIds.push(apartmentId, foreignApartmentId);

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
    if (createdPollIds.length > 0) {
      await admin
        .from("house_polls")
        .delete()
        .in("id", createdPollIds);
    }

    if (createdApartmentIds.length > 0) {
      await admin
        .from("house_apartments")
        .delete()
        .in("id", createdApartmentIds);
    }

    if (createdHouseIds.length > 0) {
      await admin
        .from("houses")
        .delete()
        .in("id", createdHouseIds);
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

  it("accepts scale 1-10 through the real database submit path", async () => {
    const poll = await createPoll({
      houseId: fixture.houseId,
      identityMode: "open",
      suffix: "scale ten",
      scaleMax: 10,
    });

    const submit = await submitPollAnswersDb({
      houseId: fixture.houseId,
      pollId: poll.pollId,
      apartmentId: fixture.apartmentId,
      answers: [
        {
          questionId: poll.questions.single,
          optionId: poll.options.single,
        },
        {
          questionId: poll.questions.multiple,
          optionIds: [
            poll.options.multipleA,
            poll.options.multipleB,
          ],
        },
        {
          questionId: poll.questions.yesNo,
          value: true,
        },
        {
          questionId: poll.questions.scale,
          value: 10,
        },
        {
          questionId: poll.questions.text,
          value: "Scale 10 real DB",
        },
      ],
    });

    expect(submit).toMatchObject({
      ok: true,
      code: "SUBMITTED",
    });

    const scaleAnswer = await admin
      .from("house_poll_answers")
      .select("scale_value")
      .eq("poll_id", poll.pollId)
      .eq("question_id", poll.questions.scale)
      .single();

    expect(scaleAnswer.error).toBeNull();
    expect(scaleAnswer.data?.scale_value).toBe(10);

    const results = await getPollResults({
      houseId: fixture.houseId,
      pollId: poll.pollId,
      viewer: { kind: "admin" },
    });

    const scale = results?.questions.find(
      (question) =>
        question.questionType === "scale",
    );

    expect(scale?.scale?.max).toBe(10);
    expect(
      scale?.scale?.distribution.find(
        (item) => item.value === 10,
      )?.count,
    ).toBe(1);
  }, 30_000);

  it("enforces all resident results visibility modes against real DB rows", async () => {
    const immediate = await createPoll({
      houseId: fixture.houseId,
      identityMode: "open",
      suffix: "visibility immediate",
      resultsVisibility: "immediate",
    });

    const immediateBefore = await getPollResults({
      houseId: fixture.houseId,
      pollId: immediate.pollId,
      viewer: {
        kind: "resident",
        apartmentId: fixture.apartmentId,
      },
    });

    expect(immediateBefore).toMatchObject({
      canViewResults: false,
      visibilityReason: "RESPOND_FIRST",
    });

    const immediateSubmit = await submitPollAnswersDb({
      houseId: fixture.houseId,
      pollId: immediate.pollId,
      apartmentId: fixture.apartmentId,
      answers: answersFor(
        immediate.questions,
        immediate.options,
      ),
    });

    expect(immediateSubmit.ok).toBe(true);

    const immediateAfter = await getPollResults({
      houseId: fixture.houseId,
      pollId: immediate.pollId,
      viewer: {
        kind: "resident",
        apartmentId: fixture.apartmentId,
      },
    });

    expect(immediateAfter?.canViewResults).toBe(true);
    expect(immediateAfter?.visibilityReason).toBeNull();

    const afterCompletion = await createPoll({
      houseId: fixture.houseId,
      identityMode: "open",
      suffix: "visibility after completion",
      resultsVisibility: "after_completion",
    });

    const delayedActive = await getPollResults({
      houseId: fixture.houseId,
      pollId: afterCompletion.pollId,
      viewer: {
        kind: "resident",
        apartmentId: fixture.apartmentId,
      },
    });

    expect(delayedActive).toMatchObject({
      canViewResults: false,
      visibilityReason: "UNTIL_COMPLETION",
    });

    const complete = await admin
      .from("house_polls")
      .update({ poll_status: "completed" })
      .eq("id", afterCompletion.pollId);

    expect(complete.error).toBeNull();

    const delayedCompleted = await getPollResults({
      houseId: fixture.houseId,
      pollId: afterCompletion.pollId,
      viewer: {
        kind: "resident",
        apartmentId: fixture.apartmentId,
      },
    });

    expect(delayedCompleted?.canViewResults).toBe(true);
    expect(delayedCompleted?.visibilityReason).toBeNull();

    const hidden = await createPoll({
      houseId: fixture.houseId,
      identityMode: "open",
      suffix: "visibility hidden",
      resultsVisibility: "hidden",
    });

    const hiddenResult = await getPollResults({
      houseId: fixture.houseId,
      pollId: hidden.pollId,
      viewer: {
        kind: "resident",
        apartmentId: fixture.apartmentId,
      },
    });

    expect(hiddenResult).toMatchObject({
      canViewResults: false,
      visibilityReason: "HIDDEN",
    });
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

    expect(foreignApartmentId).not.toBe("");

    const foreign = await submitPollAnswersDb({
      houseId: fixture.houseId,
      pollId: fixture.openPollId,
      apartmentId: foreignApartmentId,
      answers: answersFor(
        fixture.questions,
        fixture.options,
      ),
    });

    expect(foreign).toEqual({
      ok: false,
      code: "APARTMENT_INVALID",
    });
  }, 30_000);
});
