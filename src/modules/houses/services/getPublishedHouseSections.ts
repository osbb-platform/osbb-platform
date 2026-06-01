import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HouseSectionRecord } from "@/src/shared/types/entities/house.types";

export const getPublishedHouseSections = cache(async (
  housePageId: string,
): Promise<HouseSectionRecord[]> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_sections")
    .select("id, house_page_id, kind, title, sort_order, status, content")
    .eq("house_page_id", housePageId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load published house sections:", {
      housePageId,
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as HouseSectionRecord[];
});
