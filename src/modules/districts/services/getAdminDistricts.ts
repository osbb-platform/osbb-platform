import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

const DEFAULT_DISTRICT_SLUG = "bez-rayona";

export type AdminDistrictListItem = {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
  houses_count: number;
  is_system_default: boolean;
};

export async function getAdminDistricts(): Promise<AdminDistrictListItem[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const [
    { data: districts, error: districtsError },
    { data: houses, error: housesError },
  ] = await Promise.all([
    supabase
      .from("districts")
      .select("id, name, slug, theme_color")
      .order("name", { ascending: true }),
    supabase.from("houses").select("id, district_id"),
  ]);

  if (districtsError) {
    throw new Error(`Failed to load admin districts: ${districtsError.message}`);
  }

  if (housesError) {
    throw new Error(`Failed to load district houses count: ${housesError.message}`);
  }

  const housesCountMap = new Map<string, number>();

  for (const house of houses ?? []) {
    const districtId = house.district_id;

    if (!districtId) {
      continue;
    }

    housesCountMap.set(districtId, (housesCountMap.get(districtId) ?? 0) + 1);
  }

  return (districts ?? []).map((district) => ({
    ...district,
    houses_count: housesCountMap.get(district.id) ?? 0,
    is_system_default: district.slug === DEFAULT_DISTRICT_SLUG,
  })) as AdminDistrictListItem[];
}
