import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { registerAllHandlers } from "@/src/modules/content-engine/v2/handlers";
import { getAllHandlers } from "@/src/modules/content-engine/v2/registry";
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

  const heroContent = {
    headline: `Ласкаво просимо на сайт будинку ${houseName}`,
    subheadline:
      publicDescription ||
      "Тут будуть розміщуватися оголошення, звіти, важлива інформація, документи та сервісні оновлення по будинку.",
    ctaLabel: "Відкрити оголошення",
  };

  const { error: houseHeroError } = await supabase.from("house_hero").upsert(
    {
      house_id: houseId,
      headline: heroContent.headline,
      subheadline: heroContent.subheadline,
      cta_label: heroContent.ctaLabel,
    },
    {
      onConflict: "house_id",
      ignoreDuplicates: true,
    },
  );

  if (houseHeroError) {
    throw new Error(`Failed to create default house hero: ${houseHeroError.message}`);
  }

  registerAllHandlers();

  for (const handler of getAllHandlers()) {
    if (!handler.onBootstrap) {
      continue;
    }

    const result = await handler.onBootstrap({
      supabase,
      houseId,
      houseSlug,
      houseName,
    });

    if (!result.ok) {
      throw new Error(`Bootstrap ${handler.key}: ${result.error}`);
    }
  }

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
        title: "Правління",
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
