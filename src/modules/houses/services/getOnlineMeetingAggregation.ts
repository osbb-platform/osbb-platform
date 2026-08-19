import "server-only";

import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export type OnlineApartmentParticipationStatus =
  | "not_voted"
  | "partially"
  | "fully";

export type OnlineMeetingQuestionAggregation = {
  questionId: string;
  forAreaM2: number;
  againstAreaM2: number;
  abstainedAreaM2: number;
  participatingAreaM2: number;
  forPercent: number;
  againstPercent: number;
  abstainedPercent: number;
};

export type OnlineMeetingApartmentAggregation = {
  apartmentId: string;
  apartmentAreaM2: number;
  confirmedAreaM2: number;
  remainingAreaM2: number;
  status: OnlineApartmentParticipationStatus;
};

export type OnlineMeetingAggregation = {
  meetingId: string;
  houseId: string;
  totalHouseAreaM2: number;
  confirmedAreaM2: number;
  participationPercent: number;
  questions: OnlineMeetingQuestionAggregation[];
  apartments: OnlineMeetingApartmentAggregation[];
};

function objectValue(
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

function numberValue(value: unknown) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function questionRows(
  value: unknown,
): OnlineMeetingQuestionAggregation[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = objectValue(item);

    if (!row) return [];

    const questionId =
      stringValue(row.question_id);

    if (!questionId) return [];

    return [{
      questionId,
      forAreaM2:
        numberValue(row.for_area_m2),
      againstAreaM2:
        numberValue(row.against_area_m2),
      abstainedAreaM2:
        numberValue(row.abstained_area_m2),
      participatingAreaM2:
        numberValue(
          row.participating_area_m2,
        ),
      forPercent:
        numberValue(row.for_percent),
      againstPercent:
        numberValue(row.against_percent),
      abstainedPercent:
        numberValue(
          row.abstained_percent,
        ),
    }];
  });
}

function apartmentRows(
  value: unknown,
): OnlineMeetingApartmentAggregation[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = objectValue(item);

    if (!row) return [];

    const apartmentId =
      stringValue(row.apartment_id);

    const rawStatus =
      stringValue(row.status);

    if (
      !apartmentId ||
      (
        rawStatus !== "not_voted" &&
        rawStatus !== "partially" &&
        rawStatus !== "fully"
      )
    ) {
      return [];
    }

    return [{
      apartmentId,
      apartmentAreaM2:
        numberValue(row.apartment_area_m2),
      confirmedAreaM2:
        numberValue(row.confirmed_area_m2),
      remainingAreaM2:
        numberValue(row.remaining_area_m2),
      status: rawStatus,
    }];
  });
}

export async function getOnlineMeetingAggregation(
  params: {
    houseId: string;
    meetingId: string;
  },
): Promise<OnlineMeetingAggregation | null> {
  const supabase =
    createSupabaseAdminClient();

  const { data, error } =
    await supabase.rpc(
      "get_online_meeting_aggregation",
      {
        p_house_id: params.houseId,
        p_meeting_id: params.meetingId,
      },
    );

  if (error) {
    console.error(
      "Online meeting aggregation failed",
      {
        meetingId: params.meetingId,
        code: error.code,
        message: error.message,
      },
    );

    return null;
  }

  const row = objectValue(data);

  if (
    !row ||
    row.ok !== true ||
    row.code !==
      "ONLINE_AGGREGATION_READY"
  ) {
    return null;
  }

  const meetingId =
    stringValue(row.meeting_id);

  const houseId =
    stringValue(row.house_id);

  if (
    !meetingId ||
    !houseId ||
    meetingId !== params.meetingId ||
    houseId !== params.houseId
  ) {
    return null;
  }

  return {
    meetingId,
    houseId,
    totalHouseAreaM2:
      numberValue(
        row.total_house_area_m2,
      ),
    confirmedAreaM2:
      numberValue(
        row.confirmed_area_m2,
      ),
    participationPercent:
      numberValue(
        row.participation_percent,
      ),
    questions:
      questionRows(row.questions),
    apartments:
      apartmentRows(row.apartments),
  };
}
