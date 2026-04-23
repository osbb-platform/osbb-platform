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
      error: "Не вдалося визначити будинок для відновлення.",
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
      error: `Помилка завантаження будинку: ${existingHouseError.message}`,
      successMessage: null,
    };
  }

  if (!existingHouse) {
    return {
      error: "Будинок не знайдено.",
      successMessage: null,
    };
  }

  if (!existingHouse.archived_at) {
    return {
      error: "Цей будинок уже знаходиться в активному списку.",
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
      error: `Помилка відновлення будинку: ${restoreError.message}`,
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
      error: `Будинок відновлено, але квартири не вдалося повернути з архіву: ${restoreApartmentsError.message}`,
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
      description: `Будинок ${existingHouse.name} відновлено з архіву.`,
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
    successMessage: `Будинок «${existingHouse.name}» відновлено.`,
  };
}
