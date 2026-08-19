import fs from "node:fs";
import path from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(
    path.join(root, file),
    "utf8",
  );
}

describe("P06 T8 resident online voting UI", () => {
  const page = read(
    "app/(public)/house/[slug]/meetings/page.tsx",
  );

  const component = read(
    "src/modules/houses/components/PublicOnlineMeetingVoting.tsx",
  );

  const snapshot = read(
    "src/modules/houses/services/getAdminHouseMeetings.ts",
  );

  it("exposes voting mode through the existing meeting snapshot", () => {
    expect(snapshot).toContain(
      'votingMode: "manual" | "online"',
    );

    expect(snapshot).toContain(
      "votingMode: meeting.voting_mode",
    );
  });

  it("branches resident rendering by votingMode", () => {
    expect(page).toContain(
      'meeting.votingMode === "online"',
    );

    expect(page).toContain(
      'meeting.votingMode === "manual"',
    );

    expect(page).toContain(
      "PublicOnlineMeetingVoting",
    );
  });

  it("keeps legacy integer result counters manual-only", () => {
    const manualBranch =
      page.indexOf(
        'meeting.votingMode === "manual"',
        page.indexOf(
          "meeting.questions.map",
        ),
      );

    const oldCounter =
      page.indexOf(
        "getVotePercent(question.votesFor",
      );

    expect(manualBranch).toBeGreaterThan(-1);
    expect(oldCounter).toBeGreaterThan(
      manualBranch,
    );
  });

  it("loads T7 aggregation only for online meetings", () => {
    expect(page).toContain(
      "getOnlineMeetingAggregation",
    );

    expect(page).toContain(
      'item.votingMode === "online"',
    );
  });

  it("shows callback success and failure states", () => {
    expect(page).toContain(
      'onlineVote === "confirmed"',
    );

    expect(page).toContain(
      'onlineVote === "failed"',
    );

    expect(page).toContain(
      "Ваш голос підтверджено",
    );
  });

  it("supports apartment selection and owned-area input", () => {
    expect(component).toContain(
      "Оберіть квартиру",
    );

    expect(component).toContain(
      "Площа вашої частки",
    );

    expect(component).toContain(
      "remainingAreaM2",
    );
  });

  it("does not offer fully exhausted apartments", () => {
    expect(component).toContain(
      'stats?.status !== "fully"',
    );
  });

  it("requires one answer for every question", () => {
    expect(component).toContain(
      "allQuestionsAnswered",
    );

    expect(component).toContain(
      "questions.every",
    );
  });

  it("submits all answers in one initOnlineBallot call", () => {
    expect(component).toContain(
      "initOnlineBallot({",
    );

    expect(component).toContain(
      "questions.map",
    );

    expect(component).toContain(
      "ownedAreaM2: parsedArea",
    );
  });

  it("continues to provider redirect or deep link", () => {
    expect(component).toContain(
      "result.redirectUrl ??",
    );

    expect(component).toContain(
      "result.deepLink",
    );

    expect(component).toContain(
      "window.location.assign(target)",
    );
  });

  it("shows weighted results and apartment participation immediately", () => {
    expect(component).toContain(
      "Поточні результати за площею",
    );

    expect(component).toContain(
      "Статус квартир",
    );

    expect(component).toContain(
      "participationPercent",
    );

    expect(component).toContain(
      "confirmedAreaM2",
    );

    expect(component).toContain(
      "remainingAreaM2",
    );
  });

  it("contains no raw Diia identity or transaction data", () => {
    for (const forbidden of [
      "identity_hmac",
      "identityStableId",
      "provider_txn_id",
      "txnId",
      "passport",
      "rnokpp",
      "tax_number",
    ]) {
      expect(
        component.toLowerCase(),
      ).not.toContain(
        forbidden.toLowerCase(),
      );

      expect(
        page.toLowerCase(),
      ).not.toContain(
        forbidden.toLowerCase(),
      );
    }
  });

  it("does not import legacy voting runtime", () => {
    expect(page).not.toContain(
      "legacy-v1",
    );

    expect(component).not.toContain(
      "legacy-v1",
    );
  });
});
