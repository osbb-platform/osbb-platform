import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublicHouseDocumentFeedItem = {
  id: string;
  updated_at: string;
};

export const getPublicHouseDocumentsFeed = cache(async (
  houseId: string,
): Promise<PublicHouseDocumentFeedItem[]> => {
  const supabase = await createSupabaseServerClient();

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
});
