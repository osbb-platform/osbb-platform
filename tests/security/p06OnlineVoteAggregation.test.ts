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

describe("P06 T7 weighted online aggregation", () => {
  const migration = read(
    "supabase/migrations/202608191815_p06_online_vote_aggregation.sql",
  );

  const service = read(
    "src/modules/houses/services/getOnlineMeetingAggregation.ts",
  );

  it("aggregates only confirmed online ballots", () => {
    expect(migration).toContain(
      "b.status = 'confirmed'",
    );
    expect(migration).toContain(
      "v_meeting.voting_mode <> 'online'",
    );
  });

  it("weights each answer by owned_area_m2", () => {
    expect(migration).toContain(
      "sum(b.owned_area_m2)",
    );
    expect(migration).toContain(
      "filter (where ans.choice = 'for')",
    );
    expect(migration).toContain(
      "filter (where ans.choice = 'against')",
    );
    expect(migration).toContain(
      "filter (where ans.choice = 'abstained')",
    );
  });

  it("uses active apartment area as denominator", () => {
    expect(migration).toContain(
      "sum(a.area)",
    );
    expect(migration).toContain(
      "a.archived_at is null",
    );
    expect(migration).toContain(
      "v_total_house_area",
    );
  });

  it("does not use legacy integer question counters", () => {
    for (const field of [
      "votes_for",
      "votes_against",
      "votes_abstained",
      "eligible_apartments_count",
      "participating_apartments_count",
    ]) {
      expect(migration).not.toContain(
        field,
      );
    }
  });

  it("computes participation by confirmed area divided by house area", () => {
    expect(migration).toContain(
      "(v_confirmed_area / v_total_house_area) * 100",
    );
    expect(migration).toContain(
      "'participation_percent'",
    );
  });

  it("exposes all three apartment participation statuses", () => {
    expect(migration).toContain(
      "'not_voted'",
    );
    expect(migration).toContain(
      "'partially'",
    );
    expect(migration).toContain(
      "'fully'",
    );
  });

  it("shows remaining apartment area without exposing identities", () => {
    expect(migration).toContain(
      "'remaining_area_m2'",
    );
    expect(migration).not.toContain(
      "'identity_hmac'",
    );
    expect(migration).not.toContain(
      "'provider_txn_id'",
    );
  });

  it("keeps aggregate RPC service-role only", () => {
    expect(migration).toMatch(
      /get_online_meeting_aggregation[\s\S]*to service_role;/,
    );

    expect(migration).toContain(
      "from anon",
    );

    expect(migration).toContain(
      "from authenticated",
    );
  });

  it("provides a typed server-side aggregation service", () => {
    expect(service).toContain(
      "getOnlineMeetingAggregation",
    );

    expect(service).toContain(
      '"get_online_meeting_aggregation"',
    );

    expect(service).toContain(
      '"not_voted"',
    );

    expect(service).toContain(
      '"partially"',
    );

    expect(service).toContain(
      '"fully"',
    );
  });

  it("does not import legacy runtime", () => {
    expect(service).not.toContain(
      "legacy-v1",
    );

    expect(migration).not.toContain(
      "house_meeting_votes",
    );
  });
});
