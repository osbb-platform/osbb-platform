"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { insertHouseSectionVersion } from "@/src/modules/houses/actions/insertHouseSectionVersion";

type PublishHouseAnnouncementSectionResult = {
  error: string | null;
};

function normalizeLevel(value: string) {
  if (value === "danger" || value === "warning" || value === "info") {
    return value;
  }

  return "info";
}

function normalizeAnnouncementContent(
  content: unknown,
): Record<string, unknown> {
  if (typeof content === "object" && content !== null) {
    return content as Record<string, unknown>;
  }

  return {};
}

export async function publishHouseAnnouncementSection(
  formData: FormData,
): Promise<PublishHouseAnnouncementSectionResult> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "archive",
  });

  if (accessError) {
    return { error: accessError.error };
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const level = normalizeLevel(String(formData.get("level") ?? "info").trim());

  if (!sectionId || !houseId || !houseSlug) {
    return { error: "Не переданы данные для подтверждения объявления." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingSectionError } = await supabase
    .from("house_sections")
    .select("content")
    .eq("id", sectionId)
    .maybeSingle();

  if (existingSectionError || !existingSection) {
    return {
      error:
        existingSectionError?.message ?? "Не удалось получить объявление.",
    };
  }

  const existingContent = normalizeAnnouncementContent(existingSection.content);
  const nowIso = new Date().toISOString();

  const existingCreatedAt =
    typeof existingContent.createdAt === "string"
      ? existingContent.createdAt
      : nowIso;

  const existingPublishedAt =
    typeof existingContent.publishedAt === "string" &&
    existingContent.publishedAt
      ? existingContent.publishedAt
      : null;

  const content = {
    body,
    level,
    createdAt: existingCreatedAt,
    updatedAt: nowIso,
    publishedAt: existingPublishedAt ?? nowIso,
  };

  const { error: updateError } = await supabase
    .from("house_sections")
    .update({
      title: title || null,
      status: "published",
      content,
    })
    .eq("id", sectionId);

  if (updateError) {
    return { error: `Не удалось подтвердить объявление: ${updateError.message}` };
  }

  try {
    await insertHouseSectionVersion(supabase, {
      sectionId,
      title: title || null,
      status: "published",
      content,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Объявление подтверждено, но версия не сохранена: ${error.message}`
          : "Объявление подтверждено, но версия не сохранена.",
    };
  }

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}/announcements`);
  revalidatePath(`/house/${houseSlug}`);

  return { error: null };
}
