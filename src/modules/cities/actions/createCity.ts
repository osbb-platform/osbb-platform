"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { slugify } from "@/src/shared/utils/slug/slugify";

export type CreateCityState = {
  error: string | null;
  success: string | null;
};

async function resolveUniqueCitySlug(baseSlug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cities")
    .select("slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`Failed to resolve city slug: ${error.message}`);
  }

  const slugs = new Set((data ?? []).map((item) => item.slug));
  if (!slugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (slugs.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

export async function createCity(
  _prevState: CreateCityState,
  formData: FormData,
): Promise<CreateCityState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    return { error: "Недостатньо прав для створення міста.", success: null };
  }

  const name = String(formData.get("name") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "true") === "true";

  if (!name) {
    return { error: "Вкажіть назву міста.", success: null };
  }

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return { error: "Не вдалося сформувати slug міста.", success: null };
  }

  let slug = baseSlug;
  try {
    slug = await resolveUniqueCitySlug(baseSlug);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не вдалося сформувати унікальний slug міста.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: createdCity, error } = await supabase
    .from("cities")
    .insert({ name, slug, is_active: isActive })
    .select("id, name, slug, is_active")
    .single();

  if (error || !createdCity) {
    return {
      error: `Помилка створення міста: ${error?.message ?? "Unknown error"}`,
      success: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "city",
    entityId: createdCity.id,
    entityLabel: createdCity.name,
    actionType: "create_city",
    description: `Створено місто «${createdCity.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "cities",
      mainSectionKey: "settings",
      subSectionKey: "cities",
      entityType: "city",
      entityId: createdCity.id,
      entityTitle: createdCity.name,
      cityId: createdCity.id,
      cityName: createdCity.name,
      citySlug: createdCity.slug,
      isActive: createdCity.is_active,
    },
  });

  revalidatePath("/admin/cities");
  revalidatePath("/admin/districts");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/history");

  return { error: null, success: `Місто «${createdCity.name}» створено.` };
}
