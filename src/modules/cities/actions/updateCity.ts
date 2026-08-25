"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { slugify } from "@/src/shared/utils/slug/slugify";

export type UpdateCityState = {
  error: string | null;
  success: string | null;
};

async function resolveUniqueCitySlug(params: {
  baseSlug: string;
  cityId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, slug")
    .ilike("slug", `${params.baseSlug}%`);

  if (error) {
    throw new Error(`Failed to resolve city slug: ${error.message}`);
  }

  const slugs = new Set(
    (data ?? [])
      .filter((item) => item.id !== params.cityId)
      .map((item) => item.slug),
  );

  if (!slugs.has(params.baseSlug)) return params.baseSlug;

  let suffix = 2;
  while (slugs.has(`${params.baseSlug}-${suffix}`)) suffix += 1;
  return `${params.baseSlug}-${suffix}`;
}

export async function updateCity(
  _prevState: UpdateCityState,
  formData: FormData,
): Promise<UpdateCityState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    return { error: "Недостатньо прав для редагування міста.", success: null };
  }

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "true") === "true";

  if (!id || !name) {
    return { error: "Вкажіть місто та його назву.", success: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingCity, error: existingError } = await supabase
    .from("cities")
    .select("id, name, slug, is_active")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existingCity) {
    return {
      error: existingError
        ? `Не вдалося завантажити місто: ${existingError.message}`
        : "Місто не знайдено.",
      success: null,
    };
  }

  const baseSlug = slugify(name);
  if (!baseSlug) {
    return { error: "Не вдалося сформувати slug міста.", success: null };
  }

  let slug = baseSlug;
  try {
    slug = await resolveUniqueCitySlug({ baseSlug, cityId: id });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не вдалося сформувати унікальний slug міста.",
      success: null,
    };
  }

  const { data: updatedCity, error: updateError } = await supabase
    .from("cities")
    .update({ name, slug, is_active: isActive })
    .eq("id", id)
    .select("id, name, slug, is_active")
    .maybeSingle();

  if (updateError || !updatedCity) {
    return {
      error: updateError
        ? `Помилка оновлення міста: ${updateError.message}`
        : "Місто не було оновлено.",
      success: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "city",
    entityId: updatedCity.id,
    entityLabel: updatedCity.name,
    actionType: "update_city",
    description: `Оновлено місто «${updatedCity.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "cities",
      mainSectionKey: "settings",
      subSectionKey: "cities",
      entityType: "city",
      entityId: updatedCity.id,
      entityTitle: updatedCity.name,
      cityId: updatedCity.id,
      cityName: updatedCity.name,
      citySlug: updatedCity.slug,
      isActive: updatedCity.is_active,
      previousName: existingCity.name,
      previousSlug: existingCity.slug,
      previousIsActive: existingCity.is_active,
    },
  });

  revalidatePath("/admin/cities");
  revalidatePath("/admin/districts");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/history");

  return { error: null, success: `Місто «${updatedCity.name}» збережено.` };
}
