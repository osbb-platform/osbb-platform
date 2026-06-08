import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { registerAllHandlers } from "@/src/modules/content-engine/v2/handlers";
import { getAllHandlers } from "@/src/modules/content-engine/v2/registry";

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
  const supabase = createSupabaseAdminClient();

  const legacyPages = [
    {
      slug: "home",
      title: "Главная дома",
    },
    {
      slug: "information",
      title: "Информация",
    },
  ];

  const { error: legacyPagesError } = await supabase.from("house_pages").upsert(
    legacyPages.map((page) => ({
      house_id: houseId,
      slug: page.slug,
      title: page.title,
      status: "published",
    })),
    {
      onConflict: "house_id,slug",
      ignoreDuplicates: true,
    },
  );

  if (legacyPagesError) {
    throw new Error(`Failed to create legacy house pages: ${legacyPagesError.message}`);
  }

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
}
