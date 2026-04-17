"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type DeleteHouseSectionResult = {
  error: string | null;
};

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function deleteHouseSection(
  formData: FormData,
): Promise<DeleteHouseSectionResult> {
  const currentAdmin = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentAdmin?.role,
    area: "houses",
    action: "delete",
  });

  if (accessError) {
    return { error: accessError.error };
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const housePageId = String(formData.get("housePageId") ?? "").trim();

  if (!sectionId || !houseId || !houseSlug) {
    return { error: "Не переданы данные для удаления секции." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingSectionError } = await supabase
    .from("house_sections")
    .select("id, title, kind")
    .eq("id", sectionId)
    .maybeSingle();

  if (existingSectionError) {
    return {
      error: `Не удалось получить секцию перед удалением: ${existingSectionError.message}`,
    };
  }

  if (!existingSection) {
    return { error: "Секция не найдена." };
  }

  let deleteQuery = supabase
    .from("house_sections")
    .delete()
    .eq("id", sectionId);

  if (existingSection.kind === "announcements") {
    if (!housePageId) {
      return { error: "Не передан housePageId для удаления объявления." };
    }

    deleteQuery = deleteQuery
      .eq("house_page_id", housePageId)
      .eq("kind", "announcements");
  }

  const { data: deletedSection, error: sectionDeleteError } = await deleteQuery
    .select("id")
    .maybeSingle();

  if (sectionDeleteError) {
    return {
      error: `Не удалось удалить секцию: ${sectionDeleteError.message}`,
    };
  }

  if (!deletedSection) {
    return {
      error: "Секция не была удалена. Проверьте RLS/policy или условия удаления.",
    };
  }

  const { error: versionsDeleteError } = await supabase
    .from("content_versions")
    .delete()
    .eq("entity_type", "house_section")
    .eq("entity_id", sectionId);

  if (versionsDeleteError) {
    return {
      error: `Секция удалена, но не удалось удалить её версии: ${versionsDeleteError.message}`,
    };
  }

  if (
    existingSection.kind === "rich_text" ||
    existingSection.kind === "faq"
  ) {
    const currentAdmin = await getCurrentAdminUser();
    const actorName = getActorDisplayName({
      fullName: currentAdmin?.fullName ?? null,
      email: currentAdmin?.email ?? null,
    });

    await logPlatformChange({
      actorAdminId: currentAdmin?.id ?? null,
      actorName,
      actorEmail: currentAdmin?.email ?? null,
      actorRole: currentAdmin?.role ?? null,
      entityType: "house_section",
      entityId: existingSection.id,
      entityLabel: existingSection.title ?? existingSection.kind,
      actionType: "delete_house_section",
      description:
        existingSection.kind === "faq"
          ? "Удален FAQ блок."
          : `Удален информационный блок «${existingSection.title ?? "Без названия"}».`,
      houseId,
      metadata: {
        sourceType: "cms",
        sourceModule: "houses",
        mainSectionKey: "houses",
        subSectionKey:
          existingSection.kind === "faq" ? "faq" : "information",
        entityType: "house_section",
        entityId: existingSection.id,
        entityTitle: existingSection.title ?? null,
        houseId,
        kind: existingSection.kind,
      },
    });
  }

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}/announcements`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath(`/house/${houseSlug}/information`);

  return { error: null };
}
