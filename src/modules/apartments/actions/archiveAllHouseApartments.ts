"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type ArchiveAllHouseApartmentsState = {
  error: string | null;
  success: string | null;
};

export async function archiveAllHouseApartments(
  _prevState: ArchiveAllHouseApartmentsState,
  formData: FormData,
): Promise<ArchiveAllHouseApartmentsState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "apartments", action: "archive" });
  if (accessError) return { error: accessError.error, success: null };

  const houseId = String(formData.get("houseId") ?? "").trim();

  if (!houseId) {
    return {
      error: "Будинок не обрано.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: activeRows, error: activeRowsError } = await supabase
    .from("house_apartments")
    .select("id")
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (activeRowsError) {
    return {
      error: `Не вдалося отримати список квартир: ${activeRowsError.message}`,
      success: null,
    };
  }

  if (!activeRows || activeRows.length === 0) {
    return {
      error: null,
      success: "Активний список уже порожній.",
    };
  }

  const { error: archiveError } = await supabase
    .from("house_apartments")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("house_id", houseId)
    .is("archived_at", null);

  if (archiveError) {
    return {
      error: `Не вдалося очистити список: ${archiveError.message}`,
      success: null,
    };
  }


  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "apartment_registry",
      entityId: houseId,
      entityLabel: houseId,
      actionType: "archive_all_apartments",
      description: `Увесь активний список квартир будинку переміщено в архів.`,
      metadata: {
        sourceType: "cms",
        sourceModule: "apartments",
        houseId,
        archivedCount: activeRows.length,
      },
    });
  }

  revalidatePath("/admin/apartments");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: `В архів переміщено ${activeRows.length} квартир.`,
  };
}
