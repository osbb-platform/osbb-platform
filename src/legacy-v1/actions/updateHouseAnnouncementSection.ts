"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { insertHouseSectionVersion } from "@/src/modules/houses/actions/insertHouseSectionVersion";

type UpdateHouseAnnouncementSectionState = {
  error: string | null;
};

type HouseSectionStatus = "draft" | "in_review" | "published" | "archived";

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

export async function updateHouseAnnouncementSection(
  _prevState: UpdateHouseAnnouncementSectionState,
  formData: FormData,
): Promise<UpdateHouseAnnouncementSectionState> {
  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const level = normalizeLevel(String(formData.get("level") ?? "info").trim());
  const rawStatus = String(formData.get("status") ?? "draft").trim();
  const status: HouseSectionStatus =
    rawStatus === "draft" ||
    rawStatus === "in_review" ||
    rawStatus === "published" ||
    rawStatus === "archived"
      ? rawStatus
      : "draft";

  if (!sectionId || !houseId || !houseSlug) {
    return { error: "Не передано дані для оновлення оголошення." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingError } = await supabase
    .from("house_sections")
    .select("content")
    .eq("id", sectionId)
    .maybeSingle();

  if (existingError || !existingSection) {
    return {
      error: existingError?.message ?? "Не вдалося отримати оголошення.",
    };
  }

  const existingContent = normalizeAnnouncementContent(existingSection.content);
  const nowIso = new Date().toISOString();

  const content = {
    body,
    level,
    createdAt:
      typeof existingContent.createdAt === "string"
        ? existingContent.createdAt
        : nowIso,
    publishedAt:
      typeof existingContent.publishedAt === "string" ||
      existingContent.publishedAt === null
        ? existingContent.publishedAt
        : null,
    updatedAt: nowIso,
  };

  const { error: updateError } = await supabase
    .from("house_sections")
    .update({
      title: title || null,
      content,
    })
    .eq("id", sectionId);

  if (updateError) {
    return {
      error: `Не вдалося оновити оголошення: ${updateError.message}`,
    };
  }

  try {
    await insertHouseSectionVersion(supabase, {
      sectionId,
      title: title || null,
      status,
      content,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Оголошення оновлено, але версію не збережено: ${error.message}`
          : "Оголошення оновлено, але версію не збережено.",
    };
  }

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/admin/houses/${houseId}/announcements`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath(`/house/${houseSlug}/announcements`);

  return { error: null };
}
