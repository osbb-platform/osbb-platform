import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureHouseInformationPageParams = {
  houseId: string;
};

export async function ensureHouseInformationPage({
  houseId,
}: EnsureHouseInformationPageParams) {
  const supabase = await createSupabaseServerClient();

  const { data: existingPage, error: existingPageError } = await supabase
    .from("house_pages")
    .select("id, slug, title, status")
    .eq("house_id", houseId)
    .eq("slug", "information")
    .maybeSingle();

  if (existingPageError) {
    throw new Error(
      `Failed to check information page: ${existingPageError.message}`,
    );
  }

  if (existingPage) {
    return existingPage;
  }

  const { data: createdPage, error: createPageError } = await supabase
    .from("house_pages")
    .insert({
      house_id: houseId,
      slug: "information",
      title: "Інформація",
      status: "published",
    })
    .select("id, slug, title, status")
    .single();

  if (createPageError || !createdPage) {
    throw new Error(
      `Failed to create information page: ${createPageError?.message ?? "Unknown error"}`,
    );
  }

  return createdPage;
}
