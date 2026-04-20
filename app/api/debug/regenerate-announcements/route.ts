import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { generateHouseAnnouncementPdf } from "@/src/modules/houses/services/generateHouseAnnouncementPdf";

export async function POST() {
  const supabase = createSupabaseAdminClient();

  const { data: houses } = await supabase
    .from("houses")
    .select("id, name, address, osbb_name, slug, district:districts(theme_color)");

  for (const house of houses ?? []) {
    await generateHouseAnnouncementPdf({
      houseId: house.id,
      houseName: house.name ?? "Будинок",
      address: house.address ?? "",
      osbbName: house.osbb_name,
      slug: house.slug,
      accentColor: house.district?.[0]?.theme_color ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
