import { unstable_cache } from "next/cache";
import { cache } from "react";

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
    console.error("Failed to load published house meetings:", {
      houseId,
      message: meetingsError.message,
    });
    return { items: [], updatedAt: null };
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
    console.error("Failed to load published house meeting questions:", {
      houseId,
      message: questionsResult.error.message,
    });
    return { items: [], updatedAt: null };
  }

  if (manualVotesResult.error) {
    console.error("Failed to load published house meeting manual votes:", {
      houseId,
      message: manualVotesResult.error.message,
    });
    return { items: [], updatedAt: null };
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
      ["published-house-meetings", houseId],
      {
        tags: [`house:${houseId}:meetings`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
