import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedCompanyPageBySlugRecord = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  is_primary: boolean;
};

export async function getPublishedCompanyPageBySlug(
  slug: string,
): Promise<PublishedCompanyPageBySlugRecord | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_pages")
    .select("id, slug, title, status, seo_title, seo_description, is_primary")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load published company page by slug: ${error.message}`);
  }

  return (data ?? null) as PublishedCompanyPageBySlugRecord | null;
}
