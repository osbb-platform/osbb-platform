import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { HouseRecord } from "@/src/shared/types/entities/house.types";

export async function getHouseBySlug(slug: string): Promise<HouseRecord | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("houses")
    .select(
      `
        id,
        district_id,
        name,
        slug,
        address,
        osbb_name,
        short_description,
        public_description,
        is_active,
        district:districts (
          id,
          name,
          slug,
          theme_color
        )
      `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load house by slug: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as HouseRecord;
}
