import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HouseMeeting,
  HouseMeetingManualVote,
  HouseMeetingQuestion,
} from "@/src/modules/content-engine/v2/handlers/meetings";
import {
  mapHouseMeetingSnapshot,
  type AdminHouseMeetingsSnapshot,
} from "./getAdminHouseMeetings";

type ResidentMeetingsPayload = {
  meetings?: HouseMeeting[];
  questions?: HouseMeetingQuestion[];
  manual_votes?: HouseMeetingManualVote[];
};

export async function getPublishedHouseMeetings({
  houseId,
  sessionToken,
}: {
  houseId: string;
  sessionToken: string;
}): Promise<AdminHouseMeetingsSnapshot> {
  if (!houseId.trim() || !sessionToken.trim()) {
    return {
      items: [],
      updatedAt: null,
    };
  }

  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc(
    "get_resident_house_meetings",
    {
      target_house_id: houseId,
      target_session_token: sessionToken,
    },
  );

  if (error) {
    console.error(
      "[resident-meetings] RPC failed",
      {
        houseId,
        message: error.message,
      },
    );

    return {
      items: [],
      updatedAt: null,
    };
  }

  if (!data || typeof data !== "object") {
    return {
      items: [],
      updatedAt: null,
    };
  }

  const payload =
    data as unknown as ResidentMeetingsPayload;

  const meetings = Array.isArray(
    payload.meetings,
  )
    ? payload.meetings
    : [];

  const questions = Array.isArray(
    payload.questions,
  )
    ? payload.questions
    : [];

  const manualVotes = Array.isArray(
    payload.manual_votes,
  )
    ? payload.manual_votes
    : [];

  const items = meetings.map((meeting) =>
    mapHouseMeetingSnapshot({
      meeting,
      questions,
      manualVotes,
    }),
  );

  return {
    items,
    updatedAt:
      items.length > 0
        ? items
            .map((item) => item.updatedAt)
            .sort()
            .at(-1) ?? null
        : null,
  };
}
