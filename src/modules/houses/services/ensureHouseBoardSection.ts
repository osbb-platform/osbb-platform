import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type EnsureHouseBoardSectionParams = {
  housePageId: string;
  houseSlug: string;
};

export async function ensureHouseBoardSection({
  housePageId,
  houseSlug,
}: EnsureHouseBoardSectionParams) {
  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingSectionError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "contacts")
    .maybeSingle();

  if (existingSectionError) {
    throw new Error(
      `Failed to check existing board section: ${existingSectionError.message}`,
    );
  }

  if (existingSection) {
    return existingSection.id;
  }

  const defaultContent = {
    intro: "",
    roles: [],
    updatedAt: null,
  };

  const { data: createdSection, error: createSectionError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "contacts",
      title: "Правління",
      sort_order: 10,
      status: "published",
      content: defaultContent,
    })
    .select("id")
    .single();

  if (createSectionError || !createdSection) {
    throw new Error(
      `Failed to create board section: ${createSectionError?.message ?? "Unknown error"}`,
    );
  }

  const { error: versionError } = await supabase.from("content_versions").insert({
    entity_type: "house_section",
    entity_id: createdSection.id,
    version_number: 1,
    snapshot: {
      houseSlug,
      pageSlug: "home",
      sectionKind: "contacts",
      content: defaultContent,
    },
  });

  if (versionError) {
    throw new Error(
      `Failed to create initial board section version: ${versionError.message}`,
    );
  }

  return createdSection.id;
}
