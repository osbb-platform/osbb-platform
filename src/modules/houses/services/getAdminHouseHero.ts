import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseHeroSnapshot = {
  id: string;
  houseId: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  coverImageUrl: string | null;
  lockVersion: number;
  updatedAt: string;
};

type HouseHeroRow = {
  id: string;
  house_id: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cover_image_url: string | null;
  lock_version: number;
  updated_at: string;
};

const mapRow = (row: HouseHeroRow): HouseHeroSnapshot => ({
  id: row.id,
  houseId: row.house_id,
  headline: row.headline,
  subheadline: row.subheadline,
  ctaLabel: row.cta_label,
  coverImageUrl: row.cover_image_url,
  lockVersion: row.lock_version,
  updatedAt: row.updated_at,
});

export async function getAdminHouseHero(params: {
  houseId: string;
  houseName: string;
  publicDescription?: string | null;
}): Promise<HouseHeroSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("house_hero")
    .select("*")
    .eq("house_id", params.houseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load admin house hero: ${existingError.message}`);
  }

  if (existing) {
    return mapRow(existing as HouseHeroRow);
  }

  const { data: created, error: createError } = await supabase
    .from("house_hero")
    .insert({
      house_id: params.houseId,
      headline: `Ласкаво просимо на сайт будинку ${params.houseName}`,
      subheadline:
        params.publicDescription ||
        "Тут будуть розміщуватися оголошення, звіти, важлива інформація, документи та сервісні оновлення по будинку.",
      cta_label: "Відкрити оголошення",
    })
    .select("*")
    .single();

  if (createError) {
    throw new Error(`Failed to create admin house hero: ${createError.message}`);
  }

  return mapRow(created as HouseHeroRow);
}
