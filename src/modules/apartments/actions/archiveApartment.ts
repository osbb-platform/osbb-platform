"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type ArchiveApartmentState = {
  error: string | null;
  success: string | null;
};

export async function archiveApartment(
  _prevState: ArchiveApartmentState,
  formData: FormData,
): Promise<ArchiveApartmentState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "apartments", action: "archive" });
  if (accessError) return { error: accessError.error, success: null };

  const apartmentId = String(formData.get("apartmentId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();

  if (!apartmentId || !houseId) {
    return {
      error: "Не передано дані квартири.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingApartment, error: existingError } = await supabase
    .from("house_apartments")
    .select("id, apartment_label, account_number")
    .eq("id", apartmentId)
    .eq("house_id", houseId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingError || !existingApartment) {
    return {
      error:
        existingError?.message ?? "Квартиру не знайдено для архівації.",
      success: null,
    };
  }

  const { error: archiveError } = await supabase
    .from("house_apartments")
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq("id", apartmentId)
    .eq("house_id", houseId);

  if (archiveError) {
    return {
      error: `Не вдалося архівувати квартиру: ${archiveError.message}`,
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
      entityId: apartmentId,
      entityLabel: existingApartment.apartment_label,
      actionType: "archive_apartment",
      description: `Квартира ${existingApartment.apartment_label} переміщена в архів.`,
      metadata: {
        sourceType: "cms",
        sourceModule: "apartments",
        houseId,
        apartmentId,
        apartmentLabel: existingApartment.apartment_label,
        accountNumber: existingApartment.account_number,
      },
    });
  }

  revalidatePath("/admin/apartments");
  revalidatePath("/admin/history");

  return {
    error: null,
    success: "Квартира переміщена в архів.",
  };
}
