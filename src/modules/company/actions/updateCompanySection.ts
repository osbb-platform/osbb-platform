"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type UpdateCompanySectionState = {
  error: string | null;
};

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function updateCompanySection(
  _prevState: UpdateCompanySectionState,
  formData: FormData,
): Promise<UpdateCompanySectionState> {
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const companyPageId = String(formData.get("companyPageId") ?? "").trim();

  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const subheadline = String(formData.get("subheadline") ?? "").trim();
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();

  if (!sectionId || !companyPageId) {
    return { error: "Не переданы идентификаторы секции или страницы." };
  }

  const allowedStatuses = ["draft", "in_review", "published", "archived"];
  if (!allowedStatuses.includes(status)) {
    return { error: "Передан недопустимый статус секции." };
  }

  const content = {
    headline,
    subheadline,
    ctaLabel,
  };

  const supabase = await createSupabaseServerClient();

  const { data: existingVersions, error: versionsError } = await supabase
    .from("content_versions")
    .select("version_number")
    .eq("entity_type", "company_section")
    .eq("entity_id", sectionId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionsError) {
    return {
      error: `Ошибка чтения версии контента: ${versionsError.message}`,
    };
  }

  const nextVersionNumber =
    existingVersions && existingVersions.length > 0
      ? Number(existingVersions[0].version_number) + 1
      : 1;

  const { error: updateError } = await supabase
    .from("company_sections")
    .update({
      title: title || null,
      status,
      content,
    })
    .eq("id", sectionId);

  if (updateError) {
    return {
      error: `Ошибка обновления секции компании: ${updateError.message}`,
    };
  }

  const { error: versionInsertError } = await supabase
    .from("content_versions")
    .insert({
      entity_type: "company_section",
      entity_id: sectionId,
      version_number: nextVersionNumber,
      snapshot: {
        title: title || null,
        status,
        content,
      },
    });

  if (versionInsertError) {
    return {
      error: `Секция обновлена, но версия не сохранена: ${versionInsertError.message}`,
    };
  }

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
    entityType: "company_section",
    entityId: sectionId,
    entityLabel: title || "Без названия",
    actionType: "update_company_section",
    description: `Обновлена секция страницы компании.`,
    metadata: {
      sourceType: "cms",
      sourceModule: "company",
      mainSectionKey: "company",
      subSectionKey: "company_sections",
      entityType: "company_section",
      entityId: sectionId,
      entityTitle: title || null,
      companyPageId,
      sectionStatus: status,
      versionNumber: nextVersionNumber,
    },
  });

  revalidatePath("/admin/company-pages");
  revalidatePath(`/admin/company-pages/${companyPageId}`);
  revalidatePath("/");

  return { error: null };
}
