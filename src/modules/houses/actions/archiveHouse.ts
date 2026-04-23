"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type ArchiveHouseState = {
  error: string | null;
  successMessage: string | null;
};

export async function archiveHouse(
  _prevState: ArchiveHouseState,
  formData: FormData,
): Promise<ArchiveHouseState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "houses", action: "archive" });
  if (accessError) return { error: accessError.error, successMessage: null };

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      error: "Не вдалося визначити будинок для архівації.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingHouse, error: existingHouseError } = await supabase
    .from("houses")
    .select("id, name, slug, archived_at, is_active")
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

  if (existingHouse.archived_at) {
    return {
      error: "Цей будинок уже знаходиться в архіві.",
      successMessage: null,
    };
  }

  const archivedAt = new Date().toISOString();

  const { error: archiveError } = await supabase
    .from("houses")
    .update({
      archived_at: archivedAt,
      is_active: false,
    })
    .eq("id", id);

  if (archiveError) {
    return {
      error: `Помилка архівації будинку: ${archiveError.message}`,
      successMessage: null,
    };
  }

  const { error: archiveApartmentsError } = await supabase
    .from("house_apartments")
    .update({
      archived_at: archivedAt,
    })
    .eq("house_id", id)
    .is("archived_at", null);

  if (archiveApartmentsError) {
    return {
      error: `Будинок архівовано, але квартири не вдалося перенести в архів: ${archiveApartmentsError.message}`,
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
      actionType: "archive_house",
      description: `Будинок ${existingHouse.name} архівовано.`,
      metadata: {
        houseSlug: existingHouse.slug,
        archivedAt,
      },
    });
  }

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");
  revalidatePath(`/admin/houses/${id}`);
  revalidatePath(`/house/${existingHouse.slug}`);

  return {
    error: null,
    successMessage: `Будинок «${existingHouse.name}» архівовано.`,
  };
}
