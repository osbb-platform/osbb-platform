import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedCompanyPageRecord = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "in_review" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  is_primary: boolean;
};

export async function getPublishedPrimaryCompanyPage(): Promise<PublishedCompanyPageRecord | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_pages")
    .select("id, slug, title, status, seo_title, seo_description, is_primary")
    .eq("is_primary", true)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load primary company page: ${error.message}`);
  }

  return (data ?? null) as PublishedCompanyPageRecord | null;
}
