import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureHouseHomePageParams = {
  houseId: string;
};

export async function ensureHouseHomePage({
  houseId,
}: EnsureHouseHomePageParams) {
  const supabase = await createSupabaseServerClient();

  const { data: existingPage, error: existingPageError } = await supabase
    .from("house_pages")
    .select("id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", "home")
    .maybeSingle();

  if (existingPageError) {
    throw new Error(
      `Failed to check home page: ${existingPageError.message}`,
    );
  }

  if (existingPage) {
    return existingPage;
  }

  const { data: createdPage, error: createPageError } = await supabase
    .from("house_pages")
    .insert({
      house_id: houseId,
      slug: "home",
      title: "Главная дома",
      status: "published",
    })
    .select("id, slug, title, status")
    .single();

  if (createPageError || !createdPage) {
    throw new Error(
      `Failed to create home page: ${createPageError?.message ?? "Unknown error"}`,
    );
  }

  return createdPage;
}
