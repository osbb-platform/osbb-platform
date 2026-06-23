import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type PublicHouseApartmentOption = {
  id: string;
  label: string;
  ownerName: string;
};

function createPublicHouseApartmentReadClient(): SupabaseClient {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env is not configured for public apartment options");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadPublicHouseApartmentOptions({
  houseId,
}: {
  houseId: string;
}): Promise<PublicHouseApartmentOption[]> {
  const supabase = createPublicHouseApartmentReadClient();

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
    id: String(item.id),
    label: String(item.apartment_label ?? "").trim(),
    ownerName: String(item.owner_name ?? "").trim(),
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
      revalidate: 60,
    },
  )();
});
