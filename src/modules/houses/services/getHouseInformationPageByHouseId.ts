import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type HouseInformationPageRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

export const getHouseInformationPageByHouseId = cache(async (
  houseId: string,
): Promise<HouseInformationPageRecord | null> => {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", "information")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house information page: ${error.message}`);
  }

  return data ?? null;
});
