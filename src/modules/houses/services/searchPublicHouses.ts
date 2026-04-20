import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublicHouseSearchResult = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  cover_image_url: string | null;
  district: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  } | null;
};

type RawDistrict =
  | {
      id: string;
      name: string;
      slug: string;
      theme_color: string;
    }
  | Array<{
      id: string;
      name: string;
      slug: string;
      theme_color: string;
    }>
  | null;

type RawHouseRow = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  district: RawDistrict;
};

function normalizeDistrict(district: RawDistrict): PublicHouseSearchResult["district"] {
  if (!district) {
    return null;
  }

  if (Array.isArray(district)) {
    const first = district[0];
    return first
      ? {
          id: String(first.id ?? ""),
          name: String(first.name ?? ""),
          slug: String(first.slug ?? ""),
          theme_color: String(first.theme_color ?? ""),
        }
      : null;
  }

  return {
    id: String(district.id ?? ""),
    name: String(district.name ?? ""),
    slug: String(district.slug ?? ""),
    theme_color: String(district.theme_color ?? ""),
  };
}

function scoreHouse(query: string, house: Omit<PublicHouseSearchResult, "cover_image_url">) {
  const q = query.trim().toLowerCase();

  const name = house.name.toLowerCase();
  const address = house.address.toLowerCase();
  const slug = house.slug.toLowerCase();
  const osbb = (house.osbb_name ?? "").toLowerCase();

  let score = 0;

  if (address === q) score += 120;
  if (name === q) score += 110;
  if (osbb === q) score += 100;
  if (slug === q) score += 95;

  if (address.startsWith(q)) score += 70;
  if (name.startsWith(q)) score += 65;
  if (osbb.startsWith(q)) score += 60;
  if (slug.startsWith(q)) score += 50;

  if (address.includes(q)) score += 45;
  if (name.includes(q)) score += 40;
  if (osbb.includes(q)) score += 35;
  if (slug.includes(q)) score += 30;

  return score;
}

export async function searchPublicHouses(
  rawQuery: string,
): Promise<PublicHouseSearchResult[]> {
  const query = String(rawQuery ?? "").trim();

  if (query.length < 3) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const escaped = query.replace(/[%_]/g, "\\$&");
  const pattern = `%${escaped}%`;

  const { data, error } = await supabase
    .from("houses")
    .select(
      `
        id,
        name,
        slug,
        address,
        osbb_name,
        short_description,
        public_description,
        cover_image_path,
        archived_at,
        is_active,
        district:districts (
          id,
          name,
          slug,
          theme_color
        )
      `,
    )
    .eq("is_active", true)
    .is("archived_at", null)
    .or(
      [
        `name.ilike.${pattern}`,
        `address.ilike.${pattern}`,
        `osbb_name.ilike.${pattern}`,
        `slug.ilike.${pattern}`,
      ].join(","),
    )
    .limit(12);

  if (error) {
    throw new Error(`Failed to search public houses: ${error.message}`);
  }

  const rows = ((data ?? []) as unknown as RawHouseRow[]).map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    slug: String(item.slug ?? ""),
    address: String(item.address ?? ""),
    osbb_name: typeof item.osbb_name === "string" ? item.osbb_name : null,
    short_description:
      typeof item.short_description === "string" ? item.short_description : null,
    public_description:
      typeof item.public_description === "string" ? item.public_description : null,
    cover_image_path:
      typeof item.cover_image_path === "string" ? item.cover_image_path : null,
    district: normalizeDistrict(item.district),
  }));

  const scored = rows
    .map((item) => ({
      item,
      score: scoreHouse(query, item),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(({ item }) => {
    let cover_image_url: string | null = null;

    if (item.cover_image_path) {
      const { data: publicUrlData } = supabase.storage
        .from("house-cover-images")
        .getPublicUrl(item.cover_image_path);

      cover_image_url = publicUrlData.publicUrl;
    }

    return {
      ...item,
      cover_image_url,
    };
  });
}
