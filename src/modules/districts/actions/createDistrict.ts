"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { slugify } from "@/src/shared/utils/slug/slugify";

export type CreateDistrictState = {
  error: string | null;
  success: string | null;
};

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
}) {
  const supabase = await createSupabaseServerClient();
  const { baseSlug } = params;

  const { data, error } = await supabase
    .from("districts")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`Failed to resolve district slug: ${error.message}`);
  }

  const existingSlugs = new Set((data ?? []).map((item) => item.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function createDistrict(
  _prevState: CreateDistrictState,
  formData: FormData,
): Promise<CreateDistrictState> {
  const currentAdmin = await getCurrentAdminUser();

  if (!currentAdmin || (currentAdmin.role !== "admin" && currentAdmin.role !== "superadmin")) {
    return {
      error: "Недостаточно прав для создания района.",
      success: null,
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  const themeColor = normalizeHexColor(String(formData.get("themeColor") ?? ""));

  if (!name || !themeColor) {
    return { error: "Заполните название и выберите цвет района.", success: null };
  }

  const baseSlug = slugify(name);

  if (!baseSlug) {
    return { error: "Не удалось сформировать slug района.", success: null };
  }

  const supabase = await createSupabaseServerClient();

  let slug = baseSlug;

  try {
    slug = await resolveUniqueDistrictSlug({ baseSlug });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не удалось сформировать уникальный slug района.",
      success: null,
    };
  }

  const { data: createdDistrict, error } = await supabase
    .from("districts")
    .insert({
      name,
      slug,
      theme_color: themeColor,
    })
    .select("id, name, slug, theme_color")
    .single();

  if (error) {
    return { error: `Ошибка создания района: ${error.message}`, success: null };
  }

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
    entityId: createdDistrict.id,
    entityLabel: createdDistrict.name,
    actionType: "create_district",
    description: `Создан район «${createdDistrict.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "districts",
      mainSectionKey: "settings",
      subSectionKey: "districts",
      entityType: "district",
      entityId: createdDistrict.id,
      entityTitle: createdDistrict.name,
      districtId: createdDistrict.id,
      districtName: createdDistrict.name,
      districtSlug: createdDistrict.slug,
      themeColor: createdDistrict.theme_color,
    },
  });

  revalidatePath("/admin/districts");
  revalidatePath("/admin/houses");

  return {
    error: null,
    success: `Район «${createdDistrict.name}» создан.`,
  };
}
