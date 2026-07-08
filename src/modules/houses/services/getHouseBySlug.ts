import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type { HouseRecord } from "@/src/shared/types/entities/house.types";

async function loadHouseBySlug(slug: string): Promise<HouseRecord | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("houses")
    .select(
      `
        id,
        district_id,
        management_company_id,
        name,
        slug,
        address,
        osbb_name,
        short_description,
        public_description,
        cover_image_path,
        tariff_amount,
        is_active,
        district:districts (
          id,
          name,
          slug,
          theme_color
        ),
        management_company:management_companies (
          id,
          slug,
          name,
          slogan,
          phone,
          email,
          address,
          work_schedule,
          is_active
        )
      `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load house by slug:", {
      slug,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  const typedData = data as unknown as HouseRecord;

  if (typedData.cover_image_path) {
    const { data: publicUrlData } = supabase.storage
      .from("house-cover-images")
      .getPublicUrl(typedData.cover_image_path);

    typedData.cover_image_url = publicUrlData.publicUrl;
  } else {
    typedData.cover_image_url = null;
  }

  return typedData;
}

export const getHouseBySlug = cache(async (slug: string): Promise<HouseRecord | null> => {
  return unstable_cache(
    () => loadHouseBySlug(slug),
    ["public-house-by-slug", slug],
    {
      tags: ["house-by-slug", `house-slug:${slug}`],
      revalidate: 300,
    },
  )();
});
