import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HousePageRecord } from "@/src/shared/types/entities/house.types";

export const getPublishedHousePage = cache(async (
  houseId: string,
  slug: string,
): Promise<HousePageRecord | null> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, house_id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Failed to load published house page:", {
      houseId,
      slug,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  return data as HousePageRecord;
});
