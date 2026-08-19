import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202608191720_p06_online_voting_foundation.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");

describe("P06 T2 online voting foundation migration", () => {
  it("adds manual|online mode without changing existing defaults", () => {
    expect(sql).toContain(
      "add column if not exists voting_mode text not null default 'manual'",
    );
    expect(sql).toContain(
      "check (voting_mode in ('manual', 'online'))",
    );
  });

  it("creates the dedicated privacy-minimized online ballot model", () => {
    expect(sql).toContain(
      "create table if not exists public.house_meeting_online_ballots",
    );
    expect(sql).toContain(
      "create table if not exists public.house_meeting_online_answers",
    );
    expect(sql).toContain(
      "create table if not exists public.house_meeting_diia_events",
    );

    expect(sql).toContain("identity_hmac text null");
    expect(sql).toContain("owned_area_m2 numeric(10,2)");
    expect(sql).toContain(
      "status in (\n        'pending',\n        'confirmed',",
    );
  });

  it("enforces identity, challenge and transaction uniqueness", () => {
    expect(sql).toContain(
      "house_meeting_online_ballots_challenge_uq",
    );
    expect(sql).toContain(
      "house_meeting_online_ballots_identity_active_uq",
    );
    expect(sql).toContain(
      "identity_hmac is not null",
    );
    expect(sql).toContain(
      "house_meeting_online_ballots_provider_txn_uq",
    );
  });

  it("makes voting mode immutable once any vote/ballot exists", () => {
    expect(sql).toContain(
      "p06_guard_meeting_voting_mode",
    );
    expect(sql).toContain(
      "public.house_meeting_manual_votes",
    );
    expect(sql).toContain(
      "public.house_meeting_online_ballots",
    );
    expect(sql).toContain(
      "MEETING_VOTING_MODE_IMMUTABLE",
    );
  });

  it("serializes area confirmation on the apartment row", () => {
    expect(sql).toContain(
      "create or replace function public.confirm_online_ballot",
    );
    expect(sql).toMatch(
      /from public\.house_apartments[\s\S]*for update;/,
    );
    expect(sql).toContain(
      "v_confirmed_area + v_ballot.owned_area_m2 > v_apartment.area",
    );
    expect(sql).toContain(
      "APARTMENT_AREA_EXCEEDED",
    );
  });

  it("keeps the confirmation RPC server-only", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "from authenticated",
    );
    expect(sql).toContain(
      "to service_role",
    );
  });

  it("enables RLS and does not expose resident/anon table policies", () => {
    expect(sql).toContain(
      "alter table public.house_meeting_online_ballots enable row level security",
    );
    expect(sql).toContain(
      "alter table public.house_meeting_online_answers enable row level security",
    );
    expect(sql).toContain(
      "alter table public.house_meeting_diia_events enable row level security",
    );

    expect(sql).not.toMatch(
      /create policy[\s\S]{0,300}\bto anon\b/i,
    );
  });

  it("does not alter or drop the reserved legacy house_meeting_votes table", () => {
    expect(sql).not.toMatch(
      /alter\s+table\s+public\.house_meeting_votes\b/i,
    );
    expect(sql).not.toMatch(
      /drop\s+table\s+(if\s+exists\s+)?public\.house_meeting_votes\b/i,
    );
  });

  it("documents privacy restriction for Diia event payloads", () => {
    expect(sql).toContain(
      "Raw Diia callback payload and personal data are forbidden",
    );

    for (const forbidden of [
      "passport_number",
      "tax_number",
      "rnokpp",
      "first_name",
      "last_name",
      "middle_name",
      "birth_date",
    ]) {
      expect(sql.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("contains production preflight and verification SQL", () => {
    expect(sql).toContain("PRE-FLIGHT SQL");
    expect(sql).toContain("VERIFICATION SQL");
    expect(sql).toContain(
      "select count(*) from public.house_meeting_votes",
    );
  });
});
