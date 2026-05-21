import { cache } from "react";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

import type { HouseHeroSnapshot } from "./getAdminHouseHero";

type HouseHeroPublicRow = {
  id: string;
  house_id: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cover_image_url: string | null;
  lock_version: number;
  updated_at: string;
};

const mapRow = (row: HouseHeroPublicRow): HouseHeroSnapshot => ({
  id: row.id,
  houseId: row.house_id,
  headline: row.headline,
  subheadline: row.subheadline,
  ctaLabel: row.cta_label,
  coverImageUrl: row.cover_image_url,
  lockVersion: row.lock_version,
  updatedAt: row.updated_at,
});

export const getPublishedHouseHero = cache(
  async (houseId: string): Promise<HouseHeroSnapshot | null> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("house_hero")
      .select(
        "id, house_id, headline, subheadline, cta_label, cover_image_url, lock_version, updated_at",
      )
      .eq("house_id", houseId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load published house hero: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRow(data as HouseHeroPublicRow);
  },
);
