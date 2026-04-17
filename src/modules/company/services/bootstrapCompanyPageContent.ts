import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type BootstrapCompanyPageContentParams = {
  companyPageId: string;
  pageTitle: string;
  pageSlug: string;
  seoDescription: string | null;
};

export async function bootstrapCompanyPageContent({
  companyPageId,
  pageTitle,
  pageSlug,
  seoDescription,
}: BootstrapCompanyPageContentParams) {
  const supabase = await createSupabaseServerClient();

  const { data: existingHero, error: heroLookupError } = await supabase
    .from("company_sections")
    .select("id")
    .eq("company_page_id", companyPageId)
    .eq("kind", "hero")
    .maybeSingle();

  if (heroLookupError) {
    throw new Error(
      `Failed to check existing company hero section: ${heroLookupError.message}`,
    );
  }

  if (existingHero) {
    return;
  }

  const heroContent = {
    headline: pageTitle,
    subheadline:
      seoDescription ||
      "Контент страницы компании подготовлен для дальнейшего редактирования в CMS.",
    ctaLabel: "Подробнее",
  };

  const { data: createdSection, error: createSectionError } = await supabase
    .from("company_sections")
    .insert({
      company_page_id: companyPageId,
      kind: "hero",
      title: "Hero",
      sort_order: 0,
      status: "draft",
      content: heroContent,
    })
    .select("id")
    .single();

  if (createSectionError) {
    throw new Error(
      `Failed to create default company hero section: ${createSectionError.message}`,
    );
  }

  const { error: versionError } = await supabase.from("content_versions").insert({
    entity_type: "company_section",
    entity_id: createdSection.id,
    version_number: 1,
    snapshot: {
      pageSlug,
      sectionKind: "hero",
      title: "Hero",
      status: "draft",
      content: heroContent,
    },
  });

  if (versionError) {
    throw new Error(
      `Failed to create initial company content version: ${versionError.message}`,
    );
  }
}
