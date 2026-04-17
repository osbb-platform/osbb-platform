"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { slugify } from "@/src/shared/utils/slug/slugify";

export type UpdateDistrictState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_DISTRICT_SLUG = "bez-rayona";

function normalizeHexColor(value: string) {
  const normalized = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : "";
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

async function resolveUniqueDistrictSlug(params: {
  baseSlug: string;
  districtId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { baseSlug, districtId } = params;

  const { data, error } = await supabase
    .from("districts")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`Failed to resolve district slug: ${error.message}`);
  }

  const existingSlugs = new Set(
    (data ?? [])
      .filter((item) => item.id !== districtId)
      .map((item) => item.slug),
  );

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function updateDistrict(
  _prevState: UpdateDistrictState,
  formData: FormData,
): Promise<UpdateDistrictState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const themeColor = normalizeHexColor(String(formData.get("themeColor") ?? ""));

  if (!id || !name || !themeColor) {
    return {
      error: "Заполните название и выберите цвет района.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingDistrict, error: existingDistrictError } = await supabase
    .from("districts")
    .select("id, name, slug, theme_color")
    .eq("id", id)
    .maybeSingle();

  if (existingDistrictError) {
    return {
      error: `Ошибка загрузки района: ${existingDistrictError.message}`,
      success: null,
    };
  }

  if (!existingDistrict) {
    return {
      error: "Район не найден.",
      success: null,
    };
  }

  if (existingDistrict.slug === DEFAULT_DISTRICT_SLUG) {
    return {
      error: 'Системный район "Без района" нельзя редактировать.',
      success: null,
    };
  }

  const baseSlug = slugify(name);

  if (!baseSlug) {
    return {
      error: "Не удалось сформировать slug района.",
      success: null,
    };
  }

  let slug = baseSlug;

  try {
    slug = await resolveUniqueDistrictSlug({
      baseSlug,
      districtId: id,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не удалось сформировать уникальный slug района.",
      success: null,
    };
  }

  const { data: updatedDistrict, error: updateError } = await supabase
    .from("districts")
    .update({
      name,
      slug,
      theme_color: themeColor,
    })
    .eq("id", id)
    .select("id, name, slug, theme_color")
    .maybeSingle();

  if (updateError) {
    return {
      error: `Ошибка обновления района: ${updateError.message}`,
      success: null,
    };
  }

  if (!updatedDistrict) {
    return {
      error:
        "Район не был обновлен. Скорее всего, у текущего пользователя нет прав на update для таблицы districts.",
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
    entityId: updatedDistrict.id,
    entityLabel: updatedDistrict.name,
    actionType: "update_district",
    description: `Обновлен район «${updatedDistrict.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "districts",
      mainSectionKey: "settings",
      subSectionKey: "districts",
      entityType: "district",
      entityId: updatedDistrict.id,
      entityTitle: updatedDistrict.name,
      districtId: updatedDistrict.id,
      districtName: updatedDistrict.name,
      districtSlug: updatedDistrict.slug,
      themeColor: updatedDistrict.theme_color,
      previousName: existingDistrict.name,
      previousSlug: existingDistrict.slug,
      previousThemeColor: existingDistrict.theme_color,
    },
  });

  revalidatePath("/admin/districts");
  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: `Район «${updatedDistrict.name}» сохранен.`,
  };
}
