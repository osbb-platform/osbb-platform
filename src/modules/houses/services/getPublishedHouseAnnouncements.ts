import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";

export type PublishedHouseAnnouncement = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  published_at: string | null;
  updated_at: string;
};

async function loadPublishedHouseAnnouncements(
  houseId: string,
): Promise<PublishedHouseAnnouncement[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_announcements")
    .select("id, title, body, level, published_at, updated_at")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to load published announcements:", {
      houseId,
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as unknown as PublishedHouseAnnouncement[];
}

export const getPublishedHouseAnnouncements = cache(
  async (houseId: string): Promise<PublishedHouseAnnouncement[]> => {
    return unstable_cache(
      () => loadPublishedHouseAnnouncements(houseId),
      ["published-house-announcements", houseId],
      {
        tags: [`house:${houseId}:announcements`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
