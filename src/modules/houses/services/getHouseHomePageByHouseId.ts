import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type HouseHomePageRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

export const getHouseHomePageByHouseId = cache(async (
  houseId: string,
): Promise<HouseHomePageRecord | null> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", "home")
    .maybeSingle();

  if (error) {
    console.error("Failed to load house home page:", {
      houseId,
      message: error.message,
    });
    return null;
  }

  return data ?? null;
});
