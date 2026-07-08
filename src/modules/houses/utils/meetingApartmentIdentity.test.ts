import { describe, expect, it } from "vitest";

import {
  collapseMeetingManualVoteRows,
  findMeetingApartmentForVote,
  getAvailableMeetingApartments,
  getMeetingApartmentKey,
} from "./meetingApartmentIdentity";

describe("meeting apartment identity", () => {
  it("treats archived and re-imported apartment rows as the same apartment", () => {
    const apartments = [
      {
        id: "new-90",
        apartmentLabel: "Кв. 90",
        ownerName: "Гречко Любов Іосифівна",
      },
      {
        id: "new-91",
        apartmentLabel: "Кв. 91",
        ownerName: "",
      },
    ];

    const vote = {
      apartmentId: "archived-90",
      apartmentLabel: "Кв. 90 — Гречко Любов Іосифівна",
    };

    expect(findMeetingApartmentForVote(vote, apartments)).toEqual(apartments[0]);
    expect(getAvailableMeetingApartments(apartments, [vote])).toEqual([
      apartments[1],
    ]);
  });

  it("collapses duplicate vote rows created across apartment re-imports", () => {
    const votes = collapseMeetingManualVoteRows([
      {
        apartment_id: "archived-90",
        apartment_label: "Кв. 90 — Гречко Любов Іосифівна",
        question_id: "question-1",
        choice: "for" as const,
        recorded_at: "2026-07-08T09:45:00.000Z",
      },
      {
        apartment_id: "new-90",
        apartment_label: "Кв. 90 — Гречко Любов Іосифівна",
        question_id: "question-1",
        choice: "for" as const,
        recorded_at: "2026-07-08T10:12:00.000Z",
      },
      {
        apartment_id: "new-90",
        apartment_label: "Кв. 90 — Гречко Любов Іосифівна",
        question_id: "question-2",
        choice: "against" as const,
        recorded_at: "2026-07-08T10:12:00.000Z",
      },
    ]);

    expect(votes).toEqual([
      {
        apartmentId: "new-90",
        apartmentLabel: "90",
        submittedAt: "2026-07-08T10:12:00.000Z",
        answers: [
          { questionId: "question-1", choice: "for" },
          { questionId: "question-2", choice: "against" },
        ],
      },
    ]);
  });

  it("normalizes common apartment prefixes and spacing", () => {
    expect(getMeetingApartmentKey(" КВ.\u00a024 — Власник ")).toBe("24");
    expect(getMeetingApartmentKey("квартира 24")).toBe("24");
    expect(getMeetingApartmentKey("Прим. 24")).toBe("24");
  });
});
