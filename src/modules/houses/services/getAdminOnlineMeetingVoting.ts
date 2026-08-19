import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import {
  getOnlineMeetingAggregation,
  type OnlineMeetingAggregation,
} from "@/src/modules/houses/services/getOnlineMeetingAggregation";

export type AdminOnlineBallotStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "failed"
  | "cancelled";

export type AdminOnlineMeetingBallot = {
  id: string;
  apartmentId: string;
  apartmentLabel: string;
  ownedAreaM2: number;
  status: AdminOnlineBallotStatus;
  createdAt: string;
  verifiedAt: string | null;
};

export type AdminOnlineMeetingVotingSnapshot = {
  aggregation: OnlineMeetingAggregation | null;
  ballots: AdminOnlineMeetingBallot[];
};

type BallotRow = {
  id: string;
  apartment_id: string;
  owned_area_m2: number | string;
  status: AdminOnlineBallotStatus;
  created_at: string;
  verified_at: string | null;
};

type ApartmentRow = {
  id: string;
  apartment_label: string | null;
};

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getAdminOnlineMeetingVoting(params: {
  houseId: string;
  meetingId: string;
}): Promise<AdminOnlineMeetingVotingSnapshot> {
  const [aggregation, ballotsResult] = await Promise.all([
    getOnlineMeetingAggregation({
      houseId: params.houseId,
      meetingId: params.meetingId,
    }),
    createSupabaseAdminClient()
      .from("house_meeting_online_ballots")
      .select(
        [
          "id",
          "apartment_id",
          "owned_area_m2",
          "status",
          "created_at",
          "verified_at",
        ].join(", "),
      )
      .eq("house_id", params.houseId)
      .eq("meeting_id", params.meetingId)
      .order("created_at", { ascending: false }),
  ]);

  if (ballotsResult.error) {
    console.error(
      "Failed to load admin online meeting ballots:",
      ballotsResult.error.message,
    );

    return {
      aggregation,
      ballots: [],
    };
  }

  const ballots = (ballotsResult.data ?? []) as unknown as BallotRow[];
  const apartmentIds = [
    ...new Set(ballots.map((ballot) => ballot.apartment_id)),
  ];

  let apartmentLabels = new Map<string, string>();

  if (apartmentIds.length > 0) {
    const supabase = createSupabaseAdminClient();

    const apartmentsResult = await supabase
      .from("house_apartments")
      .select("id, apartment_label")
      .eq("house_id", params.houseId)
      .in("id", apartmentIds);

    if (apartmentsResult.error) {
      console.error(
        "Failed to resolve online ballot apartment labels:",
        apartmentsResult.error.message,
      );
    } else {
      apartmentLabels = new Map(
        ((apartmentsResult.data ?? []) as unknown as ApartmentRow[]).map(
          (apartment) => [
            apartment.id,
            apartment.apartment_label?.trim() || "Квартира",
          ],
        ),
      );
    }
  }

  return {
    aggregation,
    ballots: ballots.map((ballot) => ({
      id: ballot.id,
      apartmentId: ballot.apartment_id,
      apartmentLabel:
        apartmentLabels.get(ballot.apartment_id) ?? "Квартира",
      ownedAreaM2: numeric(ballot.owned_area_m2),
      status: ballot.status,
      createdAt: ballot.created_at,
      verifiedAt: ballot.verified_at,
    })),
  };
}
