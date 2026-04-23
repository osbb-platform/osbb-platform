"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type DeleteArchivedHouseState = {
  error: string | null;
  successMessage: string | null;
};

export async function deleteArchivedHouse(
  _prevState: DeleteArchivedHouseState,
  formData: FormData,
): Promise<DeleteArchivedHouseState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "houses", action: "delete" });
  if (accessError) return { error: accessError.error, successMessage: null };

  const houseId = String(formData.get("id") ?? "").trim();

  if (!houseId) {
    return {
      error: "Не вдалося визначити будинок для видалення.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: house, error: houseError } = await supabase
    .from("houses")
    .select("id, name, slug, archived_at")
    .eq("id", houseId)
    .maybeSingle();

  if (houseError || !house) {
    return {
      error: `Будинок не знайдено: ${houseError?.message ?? "Unknown error"}`,
      successMessage: null,
    };
  }

  if (!house.archived_at) {
    return {
      error: "Остаточно видалити можна лише архівний будинок.",
      successMessage: null,
    };
  }

  const { error: deletePagesError } = await supabase
    .from("house_pages")
    .delete()
    .eq("house_id", house.id);

  if (deletePagesError) {
    return {
      error: `Не вдалося видалити сторінки будинку перед фінальним видаленням: ${deletePagesError.message}`,
      successMessage: null,
    };
  }

  const { data: deletedHouse, error: deleteError } = await supabase
    .from("houses")
    .delete()
    .eq("id", house.id)
    .select("id, name, slug")
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Помилка остаточного видалення будинку: ${deleteError.message}`,
      successMessage: null,
    };
  }

  if (!deletedHouse) {
    return {
      error:
        "Будинок не було видалено. Ймовірно, видалення блокується пов’язаними записами або у поточного користувача немає прав на delete для таблиці houses.",
      successMessage: null,
    };
  }

  const currentAdmin = await getCurrentAdminUser();

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName: currentAdmin?.fullName ?? currentAdmin?.email ?? "Адміністратор",
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house",
    entityId: house.id,
    entityLabel: house.name,
    actionType: "delete_house",
    description: `Будинок «${house.name}» видалено із системи назавжди.`,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "registry",
      subSectionKey: "archive",
      entityType: "house",
      entityId: house.id,
      entityTitle: house.name,
      houseSlug: house.slug,
      deleteMode: "permanent",
    },
  });

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage: `Будинок «${house.name}» остаточно видалено.`,
  };
}
