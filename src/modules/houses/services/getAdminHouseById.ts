import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseDetail = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  cover_image_url?: string | null;
  is_active: boolean;
  district: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  } | null;
};

export async function getAdminHouseById(
  houseId: string,
): Promise<AdminHouseDetail | null> {
  noStore();

  const supabase = await createSupabaseServerClient();

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
        is_active,
        district:districts (
          id,
          name,
          slug,
          theme_color
        )
      `,
    )
    .eq("id", houseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin house detail: ${error.message}`);
  }

  const typedData = (data ?? null) as AdminHouseDetail | null;

  if (!typedData) {
    return null;
  }

  if (typedData.cover_image_path) {
    const { data: publicUrlData } = await supabase.storage
      .from("house-cover-images")
      .getPublicUrl(typedData.cover_image_path);

    typedData.cover_image_url = publicUrlData.publicUrl;
  } else {
    typedData.cover_image_url = null;
  }

  return typedData;
}
