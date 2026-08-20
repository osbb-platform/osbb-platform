import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildAdminPollExportRows,
  buildPollResultsReadModel,
  resolveResidentResultsVisibility,
  serializeAdminPollExportCsv,
  type PollResultSource,
} from "../../src/modules/houses/services/pollResultsModel";

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

function source(
  overrides?: Partial<PollResultSource["poll"]>,
): PollResultSource {
  return {
    poll: {
      id: "poll-1",
      title: "Опитування",
      description: "",
      identity_mode: "open",
      results_visibility: "immediate",
      poll_status: "active",
      ...overrides,
    },
    questions: [
      {
        id: "choice",
        question: "Choice",
        description: "",
        question_type: "single_choice",
        scale_max: null,
        sort_order: 0,
      },
      {
        id: "scale",
        question: "Scale",
        description: "",
        question_type: "scale",
        scale_max: 5,
        sort_order: 1,
      },
      {
        id: "yesno",
        question: "Yes/no",
        description: "",
        question_type: "yes_no",
        scale_max: null,
        sort_order: 2,
      },
      {
        id: "text",
        question: "Text",
        description: "",
        question_type: "free_text",
        scale_max: null,
        sort_order: 3,
      },
    ],
    options: [
      {
        id: "opt-a",
        question_id: "choice",
        label: "A",
        sort_order: 0,
      },
      {
        id: "opt-b",
        question_id: "choice",
        label: "B",
        sort_order: 1,
      },
    ],
    answers: [
      {
        question_id: "choice",
        apartment_id: "apt-1",
        option_id: "opt-a",
        scale_value: null,
        bool_value: null,
        text_value: null,
      },
      {
        question_id: "scale",
        apartment_id: "apt-1",
        option_id: null,
        scale_value: 4,
        bool_value: null,
        text_value: null,
      },
      {
        question_id: "yesno",
        apartment_id: "apt-1",
        option_id: null,
        scale_value: null,
        bool_value: true,
        text_value: null,
      },
      {
        question_id: "text",
        apartment_id: "apt-1",
        option_id: null,
        scale_value: null,
        bool_value: null,
        text_value: "Коментар",
      },
    ],
    participationApartmentIds: ["apt-1"],
    apartmentsById: {
      "apt-1": {
        apartmentLabel: "12",
        ownerName: "Іван",
      },
    },
  };
}

describe("P07 poll results read models", () => {
  it("implements exact resident visibility rules", () => {
    expect(
      resolveResidentResultsVisibility({
        resultsVisibility: "immediate",
        pollStatus: "active",
        hasResponded: false,
      }),
    ).toEqual({
      canViewResults: false,
      reason: "RESPOND_FIRST",
    });

    expect(
      resolveResidentResultsVisibility({
        resultsVisibility: "immediate",
        pollStatus: "active",
        hasResponded: true,
      }).canViewResults,
    ).toBe(true);

    expect(
      resolveResidentResultsVisibility({
        resultsVisibility: "after_completion",
        pollStatus: "active",
        hasResponded: true,
      }),
    ).toEqual({
      canViewResults: false,
      reason: "UNTIL_COMPLETION",
    });

    expect(
      resolveResidentResultsVisibility({
        resultsVisibility: "after_completion",
        pollStatus: "completed",
        hasResponded: false,
      }).canViewResults,
    ).toBe(true);

    expect(
      resolveResidentResultsVisibility({
        resultsVisibility: "hidden",
        pollStatus: "completed",
        hasResponded: true,
      }),
    ).toEqual({
      canViewResults: false,
      reason: "HIDDEN",
    });
  });

  it("aggregates options, scale and yes/no", () => {
    const model = buildPollResultsReadModel({
      source: source(),
      viewer: {
        kind: "admin",
      },
    });

    expect(model.participationCount).toBe(1);

    const choice = model.questions.find(
      (question) => question.id === "choice",
    );
    expect(choice?.options).toEqual([
      { id: "opt-a", label: "A", count: 1 },
      { id: "opt-b", label: "B", count: 0 },
    ]);

    const scale = model.questions.find(
      (question) => question.id === "scale",
    );
    expect(scale?.scale?.average).toBe(4);
    expect(
      scale?.scale?.distribution.find(
        (item) => item.value === 4,
      )?.count,
    ).toBe(1);

    const yesNo = model.questions.find(
      (question) => question.id === "yesno",
    );
    expect(yesNo?.yesNo).toEqual({
      yes: 1,
      no: 0,
    });
  });

  it("never exposes resident free-text bodies", () => {
    const model = buildPollResultsReadModel({
      source: source(),
      viewer: {
        kind: "resident",
        apartmentId: "apt-1",
      },
    });

    const text = model.questions.find(
      (question) => question.id === "text",
    );

    expect(text?.freeText?.count).toBe(1);
    expect(text?.freeText?.responses).toBeNull();
    expect(
      model.residentFreeTextNotice,
    ).toContain("не публікуються");
  });

  it("allows admin free-text list for open polls", () => {
    const model = buildPollResultsReadModel({
      source: source(),
      viewer: { kind: "admin" },
    });

    const text = model.questions.find(
      (question) => question.id === "text",
    );

    expect(text?.freeText?.responses).toEqual([
      {
        text: "Коментар",
        apartmentId: "apt-1",
        apartmentLabel: "12",
        ownerName: "Іван",
      },
    ]);
  });

  it("anonymous admin export omits apartment and owner fields entirely", () => {
    const anonymous = source({
      identity_mode: "anonymous",
    });

    anonymous.answers = anonymous.answers.map(
      (answer) => ({
        ...answer,
        apartment_id: null,
      }),
    );
    anonymous.apartmentsById = undefined;

    const rows =
      buildAdminPollExportRows(anonymous);

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
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

    const csv = serializeAdminPollExportCsv({
      identityMode: "anonymous",
      rows,
    });

    expect(csv).not.toContain("Квартира");
    expect(csv).not.toContain("Власник");
    expect(csv).not.toContain("Іван");
  });

  it("open export contains apartment identity and protects CSV formulas", () => {
    const open = source();
    open.answers.push({
      question_id: "text",
      apartment_id: "apt-1",
      option_id: null,
      scale_value: null,
      bool_value: null,
      text_value: "=1+1",
    });

    const rows = buildAdminPollExportRows(open);
    const csv = serializeAdminPollExportCsv({
      identityMode: "open",
      rows,
    });

    expect(csv).toContain("Квартира");
    expect(csv).toContain("Власник");
    expect(csv).toContain("Іван");
    expect(csv).toContain("'=1+1");
  });

  it("sensitive DB tables are only read through server-side services", () => {
    const resultsService = read(
      "src/modules/houses/services/getPollResults.ts",
    );
    const exportService = read(
      "src/modules/houses/services/getAdminPollExport.ts",
    );
    const residentWrapper = read(
      "src/modules/houses/resident/getResidentPollResults.ts",
    );

    expect(resultsService).toContain(
      'import "server-only"',
    );
    expect(exportService).toContain(
      'import "server-only"',
    );
    expect(resultsService).toContain(
      "createSupabaseAdminClient",
    );
    expect(exportService).toContain(
      "createSupabaseAdminClient",
    );
    expect(residentWrapper).toContain(
      "withResidentSession",
    );
  });
});
