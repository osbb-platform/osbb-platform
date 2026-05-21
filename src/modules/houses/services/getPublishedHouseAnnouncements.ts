import { cache } from "react";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedHouseAnnouncement = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  published_at: string | null;
  updated_at: string;
};

export const getPublishedHouseAnnouncements = cache(
  async (houseId: string): Promise<PublishedHouseAnnouncement[]> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("house_announcements")
      .select("id, title, body, level, published_at, updated_at")
      .eq("house_id", houseId)
      .eq("lifecycle_status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load published announcements: ${error.message}`);
    }

    return (data ?? []) as unknown as PublishedHouseAnnouncement[];
  },
);
