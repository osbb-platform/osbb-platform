"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type DeleteDistrictState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_DISTRICT_NAME = "Без района";
const DEFAULT_DISTRICT_SLUG = "bez-rayona";
const DEFAULT_DISTRICT_COLOR = "#9CA3AF";

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

async function ensureDefaultDistrict() {
  const supabase = await createSupabaseServerClient();

  const { data: existingDistrict, error: existingDistrictError } = await supabase
    .from("districts")
    .select("id, name, slug, theme_color")
    .eq("slug", DEFAULT_DISTRICT_SLUG)
    .maybeSingle();

  if (existingDistrictError) {
    throw new Error(
      `Не удалось проверить системный район: ${existingDistrictError.message}`,
    );
  }

  if (existingDistrict) {
    return existingDistrict;
  }

  const { data: createdDistrict, error: createError } = await supabase
    .from("districts")
    .insert({
      name: DEFAULT_DISTRICT_NAME,
      slug: DEFAULT_DISTRICT_SLUG,
      theme_color: DEFAULT_DISTRICT_COLOR,
    })
    .select("id, name, slug, theme_color")
    .single();

  if (createError || !createdDistrict) {
    throw new Error(
      `Не удалось создать системный район "Без района": ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdDistrict;
}

export async function deleteDistrict(
  _prevState: DeleteDistrictState,
  formData: FormData,
): Promise<DeleteDistrictState> {
  const districtId = String(formData.get("id") ?? "").trim();

  if (!districtId) {
    return {
      error: "Не удалось определить район для удаления.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: district, error: districtError } = await supabase
    .from("districts")
    .select("id, name, slug, theme_color")
    .eq("id", districtId)
    .maybeSingle();

  if (districtError) {
    return {
      error: `Ошибка загрузки района: ${districtError.message}`,
      success: null,
    };
  }

  if (!district) {
    return {
      error: "Район не найден.",
      success: null,
    };
  }

  if (district.slug === DEFAULT_DISTRICT_SLUG) {
    return {
      error: 'Системный район "Без района" нельзя удалить.',
      success: null,
    };
  }

  let defaultDistrict;

  try {
    defaultDistrict = await ensureDefaultDistrict();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Не удалось подготовить район "Без района".',
      success: null,
    };
  }

  const { data: housesInDistrict, error: housesLookupError } = await supabase
    .from("houses")
    .select("id")
    .eq("district_id", district.id);

  if (housesLookupError) {
    return {
      error: `Не удалось проверить дома района: ${housesLookupError.message}`,
      success: null,
    };
  }

  const housesCount = housesInDistrict?.length ?? 0;

  if (housesCount > 0) {
    const { error: reassignError } = await supabase
      .from("houses")
      .update({
        district_id: defaultDistrict.id,
      })
      .eq("district_id", district.id);

    if (reassignError) {
      return {
        error: `Не удалось перенести дома в район "Без района": ${reassignError.message}`,
        success: null,
      };
    }
  }

  const { data: deletedDistrict, error: deleteError } = await supabase
    .from("districts")
    .delete()
    .eq("id", district.id)
    .select("id, name, slug")
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Ошибка удаления района: ${deleteError.message}`,
      success: null,
    };
  }

  if (!deletedDistrict) {
    return {
      error:
        "Район не был удален. Скорее всего, у текущего пользователя нет прав на delete для таблицы districts.",
      success: null,
    };
  }

  const currentAdmin = await getCurrentAdminUser();
  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName,
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "district",
    entityId: district.id,
    entityLabel: district.name,
    actionType: "delete_district",
    description: `Удален район «${district.name}».`,
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
      reassignedToDistrictId: defaultDistrict.id,
      reassignedToDistrictSlug: defaultDistrict.slug,
      reassignedHousesCount: housesCount,
    },
  });

  revalidatePath("/admin/districts");
  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");

  return {
    error: null,
    success:
      housesCount > 0
        ? `Район «${district.name}» удален. Домов перенесено в «Без района»: ${housesCount}.`
        : `Район «${district.name}» удален.`,
  };
}
