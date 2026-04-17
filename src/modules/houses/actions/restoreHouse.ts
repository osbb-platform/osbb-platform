"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type RestoreHouseState = {
  error: string | null;
  successMessage: string | null;
};

export async function restoreHouse(
  _prevState: RestoreHouseState,
  formData: FormData,
): Promise<RestoreHouseState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "houses", action: "restore" });
  if (accessError) return { error: accessError.error, successMessage: null };

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      error: "Не удалось определить дом для восстановления.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingHouse, error: existingHouseError } = await supabase
    .from("houses")
    .select("id, name, slug, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (existingHouseError) {
    return {
      error: `Ошибка загрузки дома: ${existingHouseError.message}`,
      successMessage: null,
    };
  }

  if (!existingHouse) {
    return {
      error: "Дом не найден.",
      successMessage: null,
    };
  }

  if (!existingHouse.archived_at) {
    return {
      error: "Этот дом уже находится в активном списке.",
      successMessage: null,
    };
  }

  const { error: restoreError } = await supabase
    .from("houses")
    .update({
      archived_at: null,
      is_active: true,
    })
    .eq("id", id);

  if (restoreError) {
    return {
      error: `Ошибка восстановления дома: ${restoreError.message}`,
      successMessage: null,
    };
  }

  const { error: restoreApartmentsError } = await supabase
    .from("house_apartments")
    .update({
      archived_at: null,
    })
    .eq("house_id", id);

  if (restoreApartmentsError) {
    return {
      error: `Дом восстановлен, но квартиры не удалось вернуть из архива: ${restoreApartmentsError.message}`,
      successMessage: null,
    };
  }

  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "house",
      entityId: existingHouse.id,
      entityLabel: existingHouse.slug,
      actionType: "restore_house",
      description: `Дом ${existingHouse.name} восстановлен из архива.`,
      metadata: {
        houseSlug: existingHouse.slug,
      },
    });
  }

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");
  revalidatePath(`/admin/houses/${id}`);
  revalidatePath(`/house/${existingHouse.slug}`);

  return {
    error: null,
    successMessage: `Дом «${existingHouse.name}» восстановлен.`,
  };
}
