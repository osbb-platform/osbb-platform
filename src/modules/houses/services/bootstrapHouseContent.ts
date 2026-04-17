import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { ensureHouseHomePage } from "@/src/modules/houses/services/ensureHouseHomePage";

type BootstrapHouseContentParams = {
  houseId: string;
  houseName: string;
  houseSlug: string;
  publicDescription: string | null;
};

export async function bootstrapHouseContent({
  houseId,
  houseName,
  houseSlug,
  publicDescription,
}: BootstrapHouseContentParams) {
  const supabase = await createSupabaseServerClient();

  const homePage = await ensureHouseHomePage({ houseId });
  const homePageId = homePage.id;

  const { data: existingHero, error: heroLookupError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", homePageId)
    .eq("kind", "hero")
    .maybeSingle();

  if (heroLookupError) {
    throw new Error(
      `Failed to check existing hero section: ${heroLookupError.message}`,
    );
  }

  if (!existingHero) {
    const heroContent = {
      headline: `Добро пожаловать на сайт дома ${houseName}`,
      subheadline:
        publicDescription ||
        "Здесь будут размещаться объявления, отчеты, важная информация, документы и сервисные обновления по дому.",
      ctaLabel: "Открыть объявления",
    };

    const { data: createdHero, error: createHeroError } = await supabase
      .from("house_sections")
      .insert({
        house_page_id: homePageId,
        kind: "hero",
        title: "Hero",
        sort_order: 0,
        status: "published",
        content: heroContent,
      })
      .select("id")
      .single();

    if (createHeroError || !createdHero) {
      throw new Error(
        `Failed to create default hero section: ${createHeroError?.message ?? "Unknown error"}`,
      );
    }

    const { error: versionError } = await supabase
      .from("content_versions")
      .insert({
        entity_type: "house_section",
        entity_id: createdHero.id,
        version_number: 1,
        snapshot: {
          houseSlug,
          pageSlug: "home",
          sectionKind: "hero",
          content: heroContent,
        },
      });

    if (versionError) {
      throw new Error(
        `Failed to create initial content version: ${versionError.message}`,
      );
    }
  }

  const { data: existingBoardSection, error: boardLookupError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", homePageId)
    .eq("kind", "contacts")
    .maybeSingle();

  if (boardLookupError) {
    throw new Error(
      `Failed to check existing board section: ${boardLookupError.message}`,
    );
  }

  if (!existingBoardSection) {
    const boardContent = {
      intro: "",
      roles: [],
      chairman: null,
      members: [],
      updatedAt: null,
    };

    const { data: createdBoardSection, error: createBoardError } = await supabase
      .from("house_sections")
      .insert({
        house_page_id: homePageId,
        kind: "contacts",
        title: "Правление",
        sort_order: 10,
        status: "published",
        content: boardContent,
      })
      .select("id")
      .single();

    if (createBoardError || !createdBoardSection) {
      throw new Error(
        `Failed to create default board section: ${createBoardError?.message ?? "Unknown error"}`,
      );
    }

    const { error: boardVersionError } = await supabase
      .from("content_versions")
      .insert({
        entity_type: "house_section",
        entity_id: createdBoardSection.id,
        version_number: 1,
        snapshot: {
          houseSlug,
          pageSlug: "home",
          sectionKind: "contacts",
          content: boardContent,
        },
      });

    if (boardVersionError) {
      throw new Error(
        `Failed to create initial board content version: ${boardVersionError.message}`,
      );
    }
  }
}
