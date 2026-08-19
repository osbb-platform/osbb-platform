import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export type OnlineVoteChoice =
  | "for"
  | "against"
  | "abstained";

export type OnlineVoteAnswer = {
  questionId: string;
  choice: OnlineVoteChoice;
};

export type InitOnlineBallotDbResult =
  | {
      ok: true;
      code: "BALLOT_PENDING";
      ballotId: string;
      challengeExpiresAt: string;
    }
  | {
      ok: false;
      code: string;
    };

function normalizeRpcResult(
  value: unknown,
): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value[0] &&
    typeof value[0] === "object"
  ) {
    return value[0] as Record<string, unknown>;
  }

  return null;
}

export async function createPendingOnlineBallot(
  params: {
    houseId: string;
    meetingId: string;
    apartmentId: string;
    ownedAreaM2: number;
    answers: OnlineVoteAnswer[];
    challenge: string;
    provider: string;
  },
): Promise<InitOnlineBallotDbResult> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.rpc(
    "init_online_ballot",
    {
      p_house_id: params.houseId,
      p_meeting_id: params.meetingId,
      p_apartment_id: params.apartmentId,
      p_owned_area_m2: params.ownedAreaM2,
      p_answers: params.answers,
      p_challenge: params.challenge,
      p_provider: params.provider,
    },
  );

  if (error) {
    throw new Error(
      `ONLINE_BALLOT_INIT_DB_FAILED:${error.message}`,
    );
  }

  const row = normalizeRpcResult(data);

  if (!row || row.ok !== true) {
    return {
      ok: false,
      code:
        typeof row?.code === "string"
          ? row.code
          : "ONLINE_BALLOT_INIT_REJECTED",
    };
  }

  const ballotId = row.ballot_id;
  const challengeExpiresAt =
    row.challenge_expires_at;

  if (
    typeof ballotId !== "string" ||
    typeof challengeExpiresAt !== "string"
  ) {
    throw new Error(
      "ONLINE_BALLOT_INIT_DB_INVALID_RESPONSE",
    );
  }

  return {
    ok: true,
    code: "BALLOT_PENDING",
    ballotId,
    challengeExpiresAt,
  };
}

export async function cancelPendingOnlineBallot(
  ballotId: string,
  reason: string,
) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc(
    "cancel_online_ballot_init",
    {
      p_ballot_id: ballotId,
      p_reason: reason,
    },
  );

  if (error) {
    console.error(
      "Unable to cancel failed online ballot initialization",
      {
        ballotId,
        message: error.message,
      },
    );
  }
}
