import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";

export type PublicHouseDocumentFeedItem = {
  id: string;
  updated_at: string;
};

async function loadPublicHouseDocumentsFeed(
  houseId: string,
): Promise<PublicHouseDocumentFeedItem[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_documents")
    .select("id, updated_at")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .eq("attachment_status", "uploaded")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load public house documents feed:", {
      houseId,
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as PublicHouseDocumentFeedItem[];
}

export const getPublicHouseDocumentsFeed = cache(async (
  houseId: string,
): Promise<PublicHouseDocumentFeedItem[]> => {
  return unstable_cache(
    () => loadPublicHouseDocumentsFeed(houseId),
    ["public-house-documents-feed", houseId],
    {
      tags: [`house:${houseId}:documents`, `house:${houseId}`],
      revalidate: 300,
    },
  )();
});
