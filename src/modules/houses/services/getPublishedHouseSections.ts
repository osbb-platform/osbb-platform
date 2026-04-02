import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HouseSectionRecord } from "@/src/shared/types/entities/house.types";

export async function getPublishedHouseSections(
  housePageId: string,
): Promise<HouseSectionRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_sections")
    .select("id, house_page_id, kind, title, sort_order, status, content")
    .eq("house_page_id", housePageId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load published house sections: ${error.message}`);
  }

  return (data ?? []) as HouseSectionRecord[];
}
