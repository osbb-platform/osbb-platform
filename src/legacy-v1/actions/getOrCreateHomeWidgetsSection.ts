"use server";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export async function getOrCreateHomeWidgetsSection(houseId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: existingPage, error: pageLookupError } = await supabase
    .from("house_pages")
    .select("id")
    .eq("house_id", houseId)
    .eq("slug", "home")
    .maybeSingle();

  if (pageLookupError) {
    throw new Error(pageLookupError.message);
  }

  let pageId = existingPage?.id ?? null;

  if (!pageId) {
    const { data: createdPage, error: createPageError } = await supabase
      .from("house_pages")
      .insert({
        house_id: houseId,
        slug: "home",
        title: "Головна будинку",
        status: "published",
      })
      .select("id")
      .single();

    if (createPageError || !createdPage) {
      throw new Error(createPageError?.message ?? "Failed to create house page");
    }

    pageId = createdPage.id;
  }

  const { data: existingSection, error: sectionLookupError } = await supabase
    .from("house_sections")
    .select("id, content")
    .eq("house_page_id", pageId)
    .eq("kind", "custom")
    .eq("title", "Home widgets")
    .maybeSingle();

  if (sectionLookupError) {
    throw new Error(sectionLookupError.message);
  }

  if (existingSection) {
    return existingSection;
  }

  const { data: createdSection, error: createSectionError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: pageId,
      kind: "custom",
      title: "Home widgets",
      sort_order: 5,
      status: "published",
      content: {
        statusWidgets: [],
      },
    })
    .select("id, content")
    .single();

  if (createSectionError || !createdSection) {
    throw new Error(createSectionError?.message ?? "Failed to create home widgets section");
  }

  return createdSection;
}
