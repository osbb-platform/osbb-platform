import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  throwRequiredPublicReadError,
} from "./publicContentResilience";
import type {
  HouseMeeting,
  HouseMeetingManualVote,
  HouseMeetingQuestion,
} from "@/src/modules/content-engine/v2/handlers/meetings";
import {
  mapHouseMeetingSnapshot,
  type AdminHouseMeetingsSnapshot,
} from "./getAdminHouseMeetings";

async function loadPublishedHouseMeetings(
  houseId: string,
): Promise<AdminHouseMeetingsSnapshot> {
  const supabase = createSupabasePublicClient();

  const { data: meetingsData, error: meetingsError } = await supabase
    .from("house_meetings")
    .select("*")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (meetingsError) {
    throwRequiredPublicReadError({
      section: "meetings",
      resource: "house_meetings",
      houseId,
      error: meetingsError,
    });
  }

  const meetings = (meetingsData ?? []) as unknown as HouseMeeting[];
  const meetingIds = meetings.map((meeting) => meeting.id);

  if (meetingIds.length === 0) {
    return { items: [], updatedAt: null };
  }

  const [questionsResult, manualVotesResult] = await Promise.all([
    supabase
      .from("house_meeting_questions")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("house_meeting_manual_votes")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("recorded_at", { ascending: true }),
  ]);

  if (questionsResult.error) {
    throwRequiredPublicReadError({
      section: "meetings",
      resource: "house_meeting_questions",
      houseId,
      error: questionsResult.error,
    });
  }

  if (manualVotesResult.error) {
    throwRequiredPublicReadError({
      section: "meetings",
      resource: "house_meeting_manual_votes",
      houseId,
      error: manualVotesResult.error,
    });
  }

  const questions = (questionsResult.data ?? []) as unknown as HouseMeetingQuestion[];
  const manualVotes = (manualVotesResult.data ?? []) as unknown as HouseMeetingManualVote[];

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
        ? items.map((item) => item.updatedAt).sort().at(-1) ?? null
        : null,
  };
}

export const getPublishedHouseMeetings = cache(
  async (houseId: string): Promise<AdminHouseMeetingsSnapshot> => {
    return unstable_cache(
      () => loadPublishedHouseMeetings(houseId),
      ["published-house-meetings-v2", houseId],
      {
        tags: [`house:${houseId}:meetings`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
