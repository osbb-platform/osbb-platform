"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";

type DeleteArchivedHouseAnnouncementsResult = {
  error: string | null;
};

export async function deleteArchivedHouseAnnouncements(
  formData: FormData,
): Promise<DeleteArchivedHouseAnnouncementsResult> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "delete",
  });

  if (accessError) {
    return { error: accessError.error };
  }

  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const housePageId = String(formData.get("housePageId") ?? "").trim();

  if (!houseId || !houseSlug || !housePageId) {
    return { error: "Не передано дані будинку для видалення архівних оголошень." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: archivedSections, error: archivedSectionsError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "announcements")
    .eq("status", "archived");

  if (archivedSectionsError) {
    return {
      error: `Не вдалося отримати архівні оголошення: ${archivedSectionsError.message}`,
    };
  }

  if (!archivedSections || archivedSections.length === 0) {
    revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}/announcements`);
    revalidatePath(`/house/${houseSlug}`);
    return { error: null };
  }

  const sectionIds = archivedSections.map((section) => section.id);

  const { data: deletedSections, error: sectionsDeleteError } = await supabase
    .from("house_sections")
    .delete()
    .eq("house_page_id", housePageId)
    .eq("kind", "announcements")
    .eq("status", "archived")
    .in("id", sectionIds)
    .select("id");

  if (sectionsDeleteError) {
    return {
      error: `Не вдалося видалити архівні оголошення: ${sectionsDeleteError.message}`,
    };
  }

  const deletedIds = (deletedSections ?? []).map((section) => section.id);

  if (deletedIds.length !== sectionIds.length) {
    return {
      error: `Видалено не всі архівні оголошення: очікувалося ${sectionIds.length}, видалено ${deletedIds.length}.`,
    };
  }

  const { error: versionsDeleteError } = await supabase
    .from("content_versions")
    .delete()
    .eq("entity_type", "house_section")
    .in("entity_id", deletedIds);

  if (versionsDeleteError) {
    return {
      error: `Архівні оголошення видалено, але не вдалося видалити їхні версії: ${versionsDeleteError.message}`,
    };
  }

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}/announcements`);
  revalidatePath(`/house/${houseSlug}`);

  return { error: null };
}
