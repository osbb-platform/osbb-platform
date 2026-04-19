import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";

export async function getPublicHouseApartmentOptions({
  houseId,
}: {
  houseId: string;
}) {
  const supabase = createSupabaseAdminClient();

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
    ownerName: item.owner_name,
  }));
}
