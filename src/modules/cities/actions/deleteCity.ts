"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type DeleteCityState = {
  error: string | null;
  success: string | null;
};

export async function deleteCity(
  _prevState: DeleteCityState,
  formData: FormData,
): Promise<DeleteCityState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    return { error: "Недостатньо прав для видалення міста.", success: null };
  }

  const cityId = String(formData.get("id") ?? "").trim();
  if (!cityId) {
    return { error: "Не вдалося визначити місто.", success: null };
  }

  const cityContext = await getAdminCityContext();
  if (cityContext?.cityId === cityId) {
    return {
      error: "Не можна видалити поточне активне місто. Спочатку перемкніть контекст.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [
    { data: city, error: cityError },
    { count: districtsCount, error: districtsError },
    { count: membershipsCount, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("cities")
      .select("id, name, slug, is_active")
      .eq("id", cityId)
      .maybeSingle(),
    supabase
      .from("districts")
      .select("id", { count: "exact", head: true })
      .eq("city_id", cityId),
    supabase
      .from("admin_memberships")
      .select("id", { count: "exact", head: true })
      .eq("city_id", cityId),
  ]);

  if (cityError || !city) {
    return {
      error: cityError
        ? `Не вдалося завантажити місто: ${cityError.message}`
        : "Місто не знайдено.",
      success: null,
    };
  }

  if (districtsError || membershipsError) {
    return {
      error:
        districtsError?.message ??
        membershipsError?.message ??
        "Не вдалося перевірити залежності міста.",
      success: null,
    };
  }

  if ((districtsCount ?? 0) > 0 || (membershipsCount ?? 0) > 0) {
    return {
      error:
        "Місто не можна видалити, поки до нього прив’язані райони або співробітники.",
      success: null,
    };
  }

  const { data: deletedCity, error: deleteError } = await supabase
    .from("cities")
    .delete()
    .eq("id", cityId)
    .select("id, name, slug")
    .maybeSingle();

  if (deleteError || !deletedCity) {
    return {
      error: deleteError
        ? `Помилка видалення міста: ${deleteError.message}`
        : "Місто не було видалено.",
      success: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "city",
    entityId: deletedCity.id,
    entityLabel: deletedCity.name,
    actionType: "delete_city",
    description: `Видалено місто «${deletedCity.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "cities",
      mainSectionKey: "settings",
      subSectionKey: "cities",
      entityType: "city",
      entityId: deletedCity.id,
      entityTitle: deletedCity.name,
      cityId: deletedCity.id,
      cityName: deletedCity.name,
      citySlug: deletedCity.slug,
    },
  });

  revalidatePath("/admin/cities");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/history");

  return { error: null, success: `Місто «${deletedCity.name}» видалено.` };
}
