import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PublishedCompanyNavigationItem = {
  id: string;
  slug: string;
  title: string;
  is_primary: boolean;
};

export async function getPublishedCompanyNavigation() {
  const supabase = await createSupabaseServerClient();

  const { data: headerItems, error: headerError } = await supabase
    .from("company_pages")
    .select("id, slug, title, is_primary")
    .eq("status", "published")
    .eq("show_in_navigation", true)
    .order("nav_order", { ascending: true });

  if (headerError) {
    throw new Error(headerError.message);
  }

  const { data: footerItems, error: footerError } = await supabase
    .from("company_pages")
    .select("id, slug, title, is_primary")
    .eq("status", "published")
    .eq("show_in_footer", true)
    .order("nav_order", { ascending: true });

  if (footerError) {
    throw new Error(footerError.message);
  }

  return {
    header: (headerItems ?? []) as PublishedCompanyNavigationItem[],
    footer: (footerItems ?? []) as PublishedCompanyNavigationItem[],
  };
}
