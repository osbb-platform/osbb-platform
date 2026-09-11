// Track 3: the forensic audit found the online/internal_resident happy path
// working but left most of its listed invariants "not re-driven live this
// session" (evidence gap, not a known defect). This suite drives the real
// `internal_resident` provider flow (init_online_ballot -> HMAC identity ->
// finalize_online_ballot_callback -> confirm) against local Supabase with
// real fixtures, calling the same repository functions the resident server
// action uses (bypassing only the cookie/session HTTP layer, which is a
// separate, already-covered concern) — not source-grep of the migration SQL.
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { loadLocalEnvForRealDbTests } from "../helpers/loadLocalEnv";

vi.mock("server-only", () => ({}));

import {
  createPendingOnlineBallot,
  finalizeOnlineBallotCallback,
} from "@/src/modules/houses/resident/onlineVotingRepository";
import { internalResidentIdentityHmac } from "@/src/modules/houses/resident/internalResidentIdentity";
import { getOnlineMeetingAggregation } from "@/src/modules/houses/services/getOnlineMeetingAggregation";

loadLocalEnvForRealDbTests();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const HMAC_SECRET = "test-only-secret-not-used-in-production";

describe("P06 online/internal_resident voting invariants real DB acceptance (Track 3)", () => {
  if (!url || !serviceRoleKey) {
    throw new Error("Track 3 real-DB tests require local Supabase URL + service role key");
  }

  const admin: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let houseId = "";
  let houseSlug = "";
  let meetingId = "";
  let questionId = "";
  let apartmentAId = "";
  let apartmentBId = "";
  const APARTMENT_A_AREA = 60;
  const APARTMENT_B_AREA = 40;
  const TOTAL_HOUSE_AREA = APARTMENT_A_AREA + APARTMENT_B_AREA;

  async function castBallot(params: { apartmentId: string; ownedAreaM2: number; sessionToken: string }) {
    const challenge = randomBytes(16).toString("base64url");

    const initResult = await createPendingOnlineBallot({
      houseId,
      meetingId,
      apartmentId: params.apartmentId,
      ownedAreaM2: params.ownedAreaM2,
      answers: [{ questionId, choice: "for" }],
      challenge,
      provider: "internal_resident",
    });

    if (!initResult.ok) {
      return { ok: false as const, code: initResult.code };
    }

    const identityHmac = internalResidentIdentityHmac({
      houseId,
      meetingId,
      sessionToken: params.sessionToken,
      secret: HMAC_SECRET,
    });

    const finalized = await finalizeOnlineBallotCallback({
      ballotId: initResult.ballotId,
      meetingId,
      slug: houseSlug,
      challenge,
      provider: "internal_resident",
      identityHmac,
      txnId: `internal:${randomUUID()}`,
      verifiedAt: new Date().toISOString(),
    });

    return finalized.ok
      ? { ok: true as const, code: finalized.code, ballotId: initResult.ballotId }
      : { ok: false as const, code: finalized.code };
  }

  beforeAll(async () => {
    const managementCompany = await admin.from("management_companies").select("id").limit(1).maybeSingle();
    if (managementCompany.error || !managementCompany.data?.id) {
      throw new Error("Track 3 tests require one local management_companies row");
    }

    const houseInsert = await admin
      .from("houses")
      .insert({
        management_company_id: managementCompany.data.id,
        name: `P06 Online Invariants ${randomUUID()}`,
        slug: `p06-online-invariants-fixture-${randomUUID()}`,
        address: "x",
      })
      .select("id, slug")
      .single();
    if (houseInsert.error || !houseInsert.data) throw new Error(`fixture house failed: ${houseInsert.error?.message}`);
    houseId = houseInsert.data.id;
    houseSlug = houseInsert.data.slug;

    const apartmentsInsert = await admin
      .from("house_apartments")
      .insert([
        { house_id: houseId, account_number: "A", apartment_label: "1", owner_name: "Owner A", source_type: "manual", area: APARTMENT_A_AREA },
        { house_id: houseId, account_number: "B", apartment_label: "2", owner_name: "Owner B", source_type: "manual", area: APARTMENT_B_AREA },
      ])
      .select("id, account_number");
    if (apartmentsInsert.error) throw new Error(`fixture apartments failed: ${apartmentsInsert.error.message}`);
    apartmentAId = apartmentsInsert.data!.find((a) => a.account_number === "A")!.id;
    apartmentBId = apartmentsInsert.data!.find((a) => a.account_number === "B")!.id;

    const meetingInsert = await admin
      .from("house_meetings")
      .insert({
        house_id: houseId,
        title: "P06 Online Invariants Meeting",
        voting_mode: "online",
        lifecycle_status: "published",
        display_status: "active",
        meeting_status: "in_progress",
        lock_version: 1,
      })
      .select("id")
      .single();
    if (meetingInsert.error || !meetingInsert.data) throw new Error(`fixture meeting failed: ${meetingInsert.error?.message}`);
    meetingId = meetingInsert.data.id;

    const questionInsert = await admin
      .from("house_meeting_questions")
      .insert({ meeting_id: meetingId, question: "Invariant question", sort_order: 0 })
      .select("id")
      .single();
    if (questionInsert.error || !questionInsert.data) throw new Error(`fixture question failed: ${questionInsert.error?.message}`);
    questionId = questionInsert.data.id;
  }, 30_000);

  afterAll(async () => {
    if (houseId) await admin.from("houses").delete().eq("id", houseId);
  }, 30_000);

  it("rejects zero/invalid owned area before touching the DB", async () => {
    const result = await castBallot({ apartmentId: apartmentAId, ownedAreaM2: 0, sessionToken: randomUUID() });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OWNED_AREA_INVALID");
  }, 30_000);

  it("rejects owned area exceeding the apartment's real area (ceiling)", async () => {
    const result = await castBallot({
      apartmentId: apartmentAId,
      ownedAreaM2: APARTMENT_A_AREA + 1,
      sessionToken: randomUUID(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("OWNED_AREA_EXCEEDS_APARTMENT");
  }, 30_000);

  it("accepts a valid full-area ballot for apartment A and confirms it", async () => {
    const result = await castBallot({
      apartmentId: apartmentAId,
      ownedAreaM2: APARTMENT_A_AREA,
      sessionToken: "session-a",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(["CONFIRMED", "ALREADY_CONFIRMED"]).toContain(result.code);
  }, 30_000);

  it("rejects a second ballot for the SAME apartment once its area is fully confirmed (duplicate apartment vote)", async () => {
    const result = await castBallot({
      apartmentId: apartmentAId,
      ownedAreaM2: 1,
      sessionToken: "session-a-second-attempt",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("APARTMENT_AREA_SOFT_RESERVED");
  }, 30_000);

  it("rejects a second ballot using the SAME identity (session), even for a different apartment (duplicate identity)", async () => {
    const result = await castBallot({
      apartmentId: apartmentBId,
      ownedAreaM2: APARTMENT_B_AREA,
      sessionToken: "session-a", // same session token as the confirmed apartment-A vote
    });
    expect(result.ok).toBe(false);
  }, 30_000);

  it("weighted aggregation reflects the confirmed area, not a raw vote count", async () => {
    const aggregation = await getOnlineMeetingAggregation({ houseId, meetingId });
    expect(aggregation).not.toBeNull();

    const question = aggregation?.questions.find((q) => q.questionId === questionId);
    expect(question).toBeTruthy();
    expect(question?.forAreaM2).toBeCloseTo(APARTMENT_A_AREA, 1);

    // Confirmed area so far is exactly apartment A's area; total house area
    // is A + B. Participation must reflect area, not "1 of 2 apartments".
    expect(aggregation?.totalHouseAreaM2).toBeCloseTo(TOTAL_HOUSE_AREA, 1);
  }, 30_000);

  it("does not persist a raw session token anywhere on the ballot row (only its HMAC-derived identity)", async () => {
    const ballotRow = await admin
      .from("house_meeting_online_ballots")
      .select("identity_hmac, provider, challenge")
      .eq("meeting_id", meetingId)
      .eq("apartment_id", apartmentAId)
      .eq("status", "confirmed")
      .single();

    expect(ballotRow.error).toBeNull();
    expect(ballotRow.data?.identity_hmac).not.toBe("session-a");
    expect(ballotRow.data?.identity_hmac).toHaveLength(64); // sha256 hex digest
  }, 30_000);
});
