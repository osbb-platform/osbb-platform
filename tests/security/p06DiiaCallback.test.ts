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

describe("P06 T6 Diia callback security", () => {
  const migration = read(
    "supabase/migrations/202608191800_p06_diia_callback_security.sql",
  );

  const atomicMigration = read(
    "supabase/migrations/202608191830_p06_atomic_callback_finalize.sql",
  );

  const route = read(
    "app/api/diia/callback/route.ts",
  );

  const repository = read(
    "src/modules/houses/resident/onlineVotingRepository.ts",
  );

  it("rate-limits callback before provider verification", () => {
    const rateLimit =
      route.indexOf(
        "consumeServerRateLimit",
        route.indexOf(
          "async function handleCallback",
        ),
      );

    const verify =
      route.indexOf(
        "provider.verifyCallback",
      );

    expect(rateLimit).toBeGreaterThan(-1);
    expect(verify).toBeGreaterThan(
      rateLimit,
    );

    expect(route).toContain(
      "rateLimitPolicies.diiaCallback",
    );
  });

  it("requires provider authenticity before identity processing", () => {
    expect(route).toContain(
      "provider.verifyCallback",
    );

    expect(route).toContain(
      "if (!verified.ok)",
    );
  });

  it("never persists the raw stable identity", () => {
    expect(route).toContain(
      'createHmac(',
    );
    expect(route).toContain(
      '"sha256"',
    );
    expect(route).toContain(
      "config.identityHmacSecret",
    );

    expect(repository).toContain(
      "p_identity_hmac",
    );

    expect(repository).not.toContain(
      "identityStableId",
    );
  });

  it("binds verified callback to ballot, meeting, house, challenge and provider", () => {
    expect(migration).toContain(
      "v_ballot.meeting_id <> p_meeting_id",
    );
    expect(migration).toContain(
      "v_ballot.provider <> p_provider",
    );
    expect(migration).toContain(
      "v_ballot.challenge <> p_challenge",
    );
    expect(migration).toContain(
      "h.slug = lower(btrim(p_house_slug))",
    );
  });

  it("serializes callbacks for one ballot", () => {
    expect(migration).toMatch(
      /from public\.house_meeting_online_ballots[\s\S]*where id = p_ballot_id[\s\S]*for update;/,
    );
  });

  it("consumes a challenge only once", () => {
    expect(migration).toContain(
      "challenge_used_at timestamptz",
    );
    expect(migration).toContain(
      "v_ballot.challenge_used_at is not null",
    );
    expect(migration).toContain(
      "CALLBACK_REPLAY_BLOCKED",
    );
  });

  it("provides idempotent success for an already confirmed same transaction", () => {
    expect(migration).toContain(
      "v_ballot.status = 'confirmed'",
    );
    expect(migration).toContain(
      "v_ballot.provider_txn_id = p_txn_id",
    );
    expect(migration).toContain(
      "ALREADY_CONFIRMED",
    );
  });

  it("blocks duplicate identity within one meeting", () => {
    expect(migration).toContain(
      "other_ballot.identity_hmac = p_identity_hmac",
    );
    expect(migration).toContain(
      "other_ballot.status in ('pending', 'confirmed')",
    );
    expect(migration).toContain(
      "IDENTITY_ALREADY_VOTED",
    );
  });

  it("blocks provider transaction replay", () => {
    expect(migration).toContain(
      "other_ballot.provider_txn_id = p_txn_id",
    );
    expect(migration).toContain(
      "PROVIDER_TXN_REPLAY",
    );
  });

  it("uses DB uniqueness as final concurrent-race protection", () => {
    expect(migration).toContain(
      "when unique_violation then",
    );
    expect(migration).toContain(
      "CALLBACK_UNIQUENESS_CONFLICT",
    );
  });

  it("uses one atomic callback finalization RPC from the route", () => {
    const handler =
      route.slice(
        route.indexOf(
          "async function handleCallback",
        ),
      );

    expect(handler).toContain(
      "finalizeOnlineBallotCallback",
    );

    expect(handler).not.toContain(
      "prepareOnlineBallotCallback",
    );

    expect(handler).not.toContain(
      "confirmPreparedOnlineBallot",
    );

    expect(repository).toContain(
      '"finalize_online_ballot_callback"',
    );

    expect(atomicMigration).toContain(
      "create or replace function public.finalize_online_ballot_callback",
    );

    expect(atomicMigration).toContain(
      "public.prepare_online_ballot_callback(",
    );

    expect(atomicMigration).toContain(
      "public.confirm_online_ballot(",
    );

    expect(atomicMigration).toMatch(
      /finalize_online_ballot_callback[\s\S]*to service_role;/,
    );
  });

  it("returns only same-site generated meeting redirects", () => {
    expect(route).toContain(
      "`/house/${encodeURIComponent(slug)}/meetings`",
    );
    expect(route).toContain(
      "new URL(",
    );
    expect(route).not.toContain(
      "returnCtx.redirect",
    );
  });

  it("supports GET mock callback and future POST transport without inventing Diia fields", () => {
    expect(route).toContain(
      "export async function GET",
    );
    expect(route).toContain(
      "export async function POST",
    );
    expect(route).toContain(
      "rawProviderCallback",
    );
  });

  it("keeps callback RPCs service-role only", () => {
    expect(migration).toMatch(
      /prepare_online_ballot_callback[\s\S]*to service_role;/,
    );
    expect(migration).toMatch(
      /record_diia_callback_rejection[\s\S]*to service_role;/,
    );
  });

  it("never imports legacy runtime", () => {
    expect(route).not.toContain(
      "legacy-v1",
    );
    expect(repository).not.toContain(
      "legacy-v1",
    );
  });
});
