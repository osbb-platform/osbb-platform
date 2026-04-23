"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type BootstrapDefaultDistrictsState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_DISTRICTS = [
  {
    name: "Космічний",
    slug: "kosmicheskiy",
    theme_color: "#FCD5B4",
  },
  {
    name: "Дніпровський",
    slug: "dneprovskiy",
    theme_color: "#B2A6A4",
  },
  {
    name: "Шевченківський",
    slug: "shevchenkovskiy",
    theme_color: "#C9A4E4",
  },
  {
    name: "Вознесенівський",
    slug: "voznesenovskiy",
    theme_color: "#CCC0DA",
  },
  {
    name: "Олександрівський",
    slug: "aleksandrovskiy",
    theme_color: "#DCE6F1",
  },
  {
    name: "Хортицький",
    slug: "khortytskyi",
    theme_color: "#B7DEE8",
  },
  {
    name: "Заводський",
    slug: "zavodskoy",
    theme_color: "#DF81A0",
  },
] as const;

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Адміністратор";
}

export async function bootstrapDefaultDistricts(
  _prevState: BootstrapDefaultDistrictsState,
): Promise<BootstrapDefaultDistrictsState> {
  void _prevState;

  const supabase = await createSupabaseServerClient();

  const defaultSlugs = DEFAULT_DISTRICTS.map((district) => district.slug);

  const { data: existingDistricts, error: existingDistrictsError } = await supabase
    .from("districts")
    .select("slug")
    .in("slug", defaultSlugs);

  if (existingDistrictsError) {
    return {
      error: `Не вдалося перевірити існуючі райони: ${existingDistrictsError.message}`,
      success: null,
    };
  }

  const existingSlugSet = new Set(
    (existingDistricts ?? []).map((district) => district.slug),
  );

  const districtsToCreate = DEFAULT_DISTRICTS.filter(
    (district) => !existingSlugSet.has(district.slug),
  );

  if (districtsToCreate.length === 0) {
    return {
      error: null,
      success: "Усі базові райони вже створені.",
    };
  }

  const { data: createdDistricts, error: createError } = await supabase
    .from("districts")
    .insert(districtsToCreate)
    .select("id, name, slug, theme_color");

  if (createError) {
    return {
      error: `Помилка створення районів: ${createError.message}`,
      success: null,
    };
  }

  const currentAdmin = await getCurrentAdminUser();
  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  for (const district of createdDistricts ?? []) {
    await logPlatformChange({
      actorAdminId: currentAdmin?.id ?? null,
      actorName,
      actorEmail: currentAdmin?.email ?? null,
      actorRole: currentAdmin?.role ?? null,
      entityType: "district",
      entityId: district.id,
      entityLabel: district.name,
      actionType: "create_district",
      description: `Створено район «${district.name}».`,
      metadata: {
        sourceType: "cms",
        sourceModule: "districts",
        mainSectionKey: "settings",
        subSectionKey: "districts",
        entityType: "district",
        entityId: district.id,
        entityTitle: district.name,
        districtId: district.id,
        districtName: district.name,
        districtSlug: district.slug,
        themeColor: district.theme_color,
        createdBy: "bootstrap_default_districts",
      },
    });
  }

  revalidatePath("/admin/districts");

  return {
    error: null,
    success: `Готово: створено районів — ${createdDistricts?.length ?? 0}.`,
  };
}
