import "server-only";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";

export type PublicHouseApartmentOption = {
  id: string;
  label: string;
};

type ResidentApartmentOptionRow = {
  id: string;
  apartment_label: string;
};

export async function getPublicHouseApartmentOptions({
  houseId,
  sessionToken,
}: {
  houseId: string;
  sessionToken: string;
}): Promise<PublicHouseApartmentOption[]> {
  if (!houseId.trim() || !sessionToken.trim()) {
    return [];
  }

  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc(
    "get_resident_house_apartment_options",
    {
      target_house_id: houseId,
      target_session_token: sessionToken,
    },
  );

  if (error) {
    console.error(
      "[resident-apartment-options] RPC failed",
      {
        houseId,
        message: error.message,
      },
    );

    return [];
  }

  return (
    (data ?? []) as ResidentApartmentOptionRow[]
  )
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      label: String(
        item.apartment_label ?? "",
      ).trim(),
    }))
    .filter(
      (item) => Boolean(item.id && item.label),
    );
}
