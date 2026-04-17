"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";

export async function archiveHouseInformationSection(formData: FormData) {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "archive",
  });

  if (accessError) {
    throw new Error(accessError.error ?? "Access denied");
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();

  if (!sectionId || !houseId || !houseSlug) {
    throw new Error("Не переданы идентификаторы для архивации сообщения.");
  }

  const supabase = await createSupabaseServerClient();

  const { data: section, error: sectionError } = await supabase
    .from("house_sections")
    .select("title, content")
    .eq("id", sectionId)
    .maybeSingle();

  if (sectionError || !section) {
    throw new Error(
      `Ошибка чтения сообщения перед архивацией: ${sectionError?.message ?? "Not found"}`,
    );
  }

  const existingContent =
    section.content && typeof section.content === "object"
      ? (section.content as Record<string, unknown>)
      : {};

  const nextContent = {
    ...existingContent,
    updatedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("house_sections")
    .update({
      status: "archived",
      content: nextContent,
    })
    .eq("id", sectionId);

  if (updateError) {
    throw new Error(`Ошибка архивации сообщения: ${updateError.message}`);
  }

  const { data: versions } = await supabase
    .from("content_versions")
    .select("version_number")
    .eq("entity_type", "house_section")
    .eq("entity_id", sectionId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber =
    versions && versions.length > 0
      ? Number(versions[0].version_number) + 1
      : 1;

  await supabase.from("content_versions").insert({
    entity_type: "house_section",
    entity_id: sectionId,
    version_number: nextVersionNumber,
    snapshot: {
      title: section.title,
      status: "archived",
      content: nextContent,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath(`/house/${houseSlug}/information`);
}
