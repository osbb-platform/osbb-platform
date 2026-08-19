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

describe("P06 T5 resident ballot initiation", () => {
  const migration = read(
    "supabase/migrations/202608191745_p06_online_ballot_init.sql",
  );

  const action = read(
    "src/modules/houses/resident/initOnlineBallot.ts",
  );

  const repository = read(
    "src/modules/houses/resident/onlineVotingRepository.ts",
  );

  it("uses the shared resident write boundary and dedicated rate limit", () => {
    expect(action).toContain(
      "withResidentSession",
    );
    expect(action).toContain(
      "rateLimitPolicies.residentVoteInit",
    );
  });

  it("does not create a ballot while the provider feature is disabled", () => {
    const providerCheck =
      action.indexOf(
        "!providerResolution.provider",
      );

    const createCall =
      action.indexOf(
        "createPendingOnlineBallot",
        action.indexOf(
          "export async function initOnlineBallot",
        ),
      );

    expect(providerCheck).toBeGreaterThan(-1);
    expect(createCall).toBeGreaterThan(
      providerCheck,
    );

    expect(action).toContain(
      "ONLINE_VOTING_UNAVAILABLE",
    );
  });

  it("uses a cryptographically random challenge", () => {
    expect(action).toContain(
      "randomBytes(32)",
    );
    expect(action).toContain(
      'toString("base64url")',
    );
  });

  it("creates ballot answers and initiated audit in one DB transaction", () => {
    expect(migration).toContain(
      "create or replace function public.init_online_ballot",
    );
    expect(migration).toContain(
      "insert into public.house_meeting_online_ballots",
    );
    expect(migration).toContain(
      "insert into public.house_meeting_online_answers",
    );
    expect(migration).toContain(
      "insert into public.house_meeting_diia_events",
    );
    expect(migration).toContain(
      "'initiated'",
    );
  });

  it("requires an active published online meeting", () => {
    expect(migration).toContain(
      "v_meeting.voting_mode <> 'online'",
    );
    expect(migration).toContain(
      "v_meeting.lifecycle_status <> 'published'",
    );
    expect(migration).toContain(
      "v_meeting.display_status <> 'active'",
    );
    expect(migration).toContain(
      "v_meeting.meeting_status <> 'in_progress'",
    );
  });

  it("validates apartment ownership-area prerequisites", () => {
    expect(migration).toContain(
      "v_apartment.area is null",
    );
    expect(migration).toContain(
      "p_owned_area_m2 > v_apartment.area",
    );
  });

  it("expires stale pending ballots before soft-reservation calculation", () => {
    const housekeeping =
      migration.indexOf(
        "PENDING_HOUSEKEEPING_EXPIRED",
      );

    const pendingSum =
      migration.indexOf(
        "into v_pending_area",
      );

    expect(housekeeping).toBeGreaterThan(-1);
    expect(pendingSum).toBeGreaterThan(
      housekeeping,
    );
  });

  it("soft-reserves confirmed plus live pending area", () => {
    expect(migration).toContain(
      "v_confirmed_area",
    );
    expect(migration).toContain(
      "v_pending_area",
    );
    expect(migration).toContain(
      "v_confirmed_area\n    + v_pending_area\n    + p_owned_area_m2",
    );
    expect(migration).toContain(
      "APARTMENT_AREA_SOFT_RESERVED",
    );
  });

  it("requires exactly one valid answer for every meeting question", () => {
    expect(migration).toContain(
      "v_expected_question_count",
    );
    expect(migration).toContain(
      "count(distinct item->>'questionId')",
    );
    expect(migration).toContain(
      "QUESTION_SCOPE_INVALID",
    );
  });

  it("uses the 15-minute pending challenge TTL", () => {
    expect(migration).toContain(
      "interval '15 minutes'",
    );
  });

  it("keeps init and cancel RPCs service-role only", () => {
    expect(migration).toMatch(
      /init_online_ballot[\s\S]*to service_role;/,
    );
    expect(migration).toMatch(
      /cancel_online_ballot_init[\s\S]*to service_role;/,
    );
    expect(migration).toContain(
      "from anon",
    );
    expect(migration).toContain(
      "from authenticated",
    );
  });

  it("contains exactly one narrow privileged repository boundary", () => {
    expect(repository).toContain(
      "createSupabaseAdminClient",
    );
    expect(repository).toContain(
      '"init_online_ballot"',
    );
    expect(repository).toContain(
      '"cancel_online_ballot_init"',
    );
  });

  it("cancels pending ballot if provider initiation fails", () => {
    expect(action).toContain(
      "cancelPendingOnlineBallot",
    );
    expect(action).toContain(
      '"AUTH_INIT_FAILED"',
    );
  });

  it("passes no resident session token to the provider", () => {
    expect(action).not.toContain(
      "sessionToken",
    );
  });

  it("does not import legacy runtime code", () => {
    expect(action).not.toContain(
      "legacy-v1",
    );
    expect(repository).not.toContain(
      "legacy-v1",
    );
  });
});
