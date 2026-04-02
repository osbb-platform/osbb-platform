import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HousePageRecord } from "@/src/shared/types/entities/house.types";

export async function getPublishedHousePage(
  houseId: string,
  slug: string,
): Promise<HousePageRecord | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, house_id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load published house page: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as HousePageRecord;
}
