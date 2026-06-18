import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";

type PublicHouseApartmentOption = {
  id: string;
  label: string;
  ownerName: string;
};

async function loadPublicHouseApartmentOptions({
  houseId,
}: {
  houseId: string;
}): Promise<PublicHouseApartmentOption[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_apartments")
    .select("id, apartment_label, owner_name")
    .eq("house_id", houseId)
    .is("archived_at", null)
    .order("apartment_label", { ascending: true });

  if (error) {
    console.error("[getPublicHouseApartmentOptions]", error);
    return [];
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    label: item.apartment_label,
    ownerName: item.owner_name ?? "",
  }));
}

export const getPublicHouseApartmentOptions = cache(async ({
  houseId,
}: {
  houseId: string;
}) => {
  return unstable_cache(
    () => loadPublicHouseApartmentOptions({ houseId }),
    ["public-house-apartment-options", houseId],
    {
      tags: [`house:${houseId}:apartments`, `house:${houseId}`],
      revalidate: 300,
    },
  )();
});
