import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type HouseHomePageRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

export async function getHouseHomePageByHouseId(
  houseId: string,
): Promise<HouseHomePageRecord | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("house_pages")
    .select("id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", "home")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house home page: ${error.message}`);
  }

  return data ?? null;
}
