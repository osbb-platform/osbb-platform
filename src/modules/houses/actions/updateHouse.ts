"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type UpdateHouseState = {
  error: string | null;
  successMessage: string | null;
};

const HOUSE_COVER_BUCKET = "house-cover-images";

export async function updateHouse(
  _prevState: UpdateHouseState,
  formData: FormData,
): Promise<UpdateHouseState> {
  const uploadedImagePath = String(formData.get("uploadedImagePath") ?? "").trim();
  const currentUser = await getCurrentAdminUser();
  const supabase = await createSupabaseServerClient();

  async function failWithCleanup(error: string): Promise<UpdateHouseState> {
    if (uploadedImagePath) {
      await supabase.storage.from(HOUSE_COVER_BUCKET).remove([uploadedImagePath]);
    }

    return { error, successMessage: null };
  }

  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "edit",
  });
  if (accessError) return failWithCleanup(accessError.error ?? "Недостатньо прав для виконання дії.");

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const osbbName = String(formData.get("osbbName") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "").trim();
  const managementCompanyId = String(formData.get("managementCompanyId") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const publicDescription = String(formData.get("publicDescription") ?? "").trim();
  const removeCoverImage =
    String(formData.get("removeCoverImage") ?? "false") === "true";

  if (!id || !name || !address) {
    return failWithCleanup("Заповніть обов’язкові поля: назва та адреса.");
  }

  if (!districtId) {
    return failWithCleanup("Оберіть район для будинку.");
  }

  if (!managementCompanyId) {
    return failWithCleanup("Оберіть керуючу компанію для будинку.");
  }

  const { data: existingHouse, error: existingHouseError } = await supabase
    .from("houses")
    .select("id, slug, name, district_id, archived_at, cover_image_path")
    .eq("id", id)
    .maybeSingle();

  if (existingHouseError) {
    return failWithCleanup(`Помилка завантаження будинку: ${existingHouseError.message}`);
  }

  if (!existingHouse) {
    return failWithCleanup("Будинок не знайдено.");
  }

  if (existingHouse.archived_at) {
    return failWithCleanup("Не можна редагувати архівний будинок. Спочатку відновіть його.");
  }

  let nextCoverImagePath =
    typeof existingHouse.cover_image_path === "string"
      ? existingHouse.cover_image_path
      : null;

  if ((removeCoverImage || uploadedImagePath) && nextCoverImagePath) {
    const { error: removeError } = await supabase.storage
      .from(HOUSE_COVER_BUCKET)
      .remove([nextCoverImagePath]);

    if (removeError) {
      return failWithCleanup(`Не вдалося видалити поточне фото будинку: ${removeError.message}`);
    }

    nextCoverImagePath = null;
  }

  if (uploadedImagePath) {
    nextCoverImagePath = uploadedImagePath;
  }

  const { data: updatedHouse, error: updateError } = await supabase
    .from("houses")
    .update({
      name,
      address,
      osbb_name: osbbName || null,
      district_id: districtId,
      management_company_id: managementCompanyId,
      short_description: shortDescription || null,
      public_description: publicDescription || null,
      cover_image_path: nextCoverImagePath,
    })
    .eq("id", id)
    .select("id, slug, name, district:districts(theme_color)")
    .maybeSingle();

  if (updateError) {
    return failWithCleanup(`Помилка оновлення будинку: ${updateError.message}`);
  }

  if (!updatedHouse) {
    return failWithCleanup("Будинок не було оновлено.");
  }

  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "house",
      entityId: id,
      entityLabel: existingHouse.slug ?? null,
      actionType: "update_house",
      description: `Будинок ${name} оновлено.`,
      metadata: {
        houseSlug: updatedHouse.slug,
        districtChanged: existingHouse.district_id !== districtId,
      },
    });
  }

  try {
    const { generateHouseAnnouncementPdf } = await import(
      "@/src/modules/houses/services/generateHouseAnnouncementPdf"
    );
    await generateHouseAnnouncementPdf({
      houseId: updatedHouse.id,
      houseName: name,
      address,
      osbbName,
      slug: updatedHouse.slug,
      accentColor:
        updatedHouse.district &&
        typeof updatedHouse.district === "object" &&
        "theme_color" in updatedHouse.district
          ? String(updatedHouse.district.theme_color ?? "")
          : null,
    });
  } catch (e) {
    console.error("announcement pdf trigger error", e);
  }

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");
  revalidatePath(`/admin/houses/${id}`);
  revalidatePath(`/house/${updatedHouse.slug}`);

  return {
    error: null,
    successMessage: `Будинок «${updatedHouse.name}» оновлено.`,
  };
}
