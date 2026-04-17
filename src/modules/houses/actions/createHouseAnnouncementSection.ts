"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

function normalizeLevel(value: string) {
  if (value === "danger" || value === "warning" || value === "info") {
    return value;
  }

  return "info";
}

export async function createHouseAnnouncementSection(formData: FormData) {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const housePageId = String(formData.get("housePageId") ?? "").trim();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const level = normalizeLevel(String(formData.get("level") ?? "info").trim());

  if (!houseId || !houseSlug || !housePageId) {
    throw new Error("Не переданы данные дома для создания объявления.");
  }

  if (!title) {
    throw new Error("Заполните заголовок объявления.");
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingSections, error: existingError } = await supabase
    .from("house_sections")
    .select("sort_order")
    .eq("house_page_id", housePageId)
    .eq("kind", "announcements")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const nextSortOrder =
    existingSections && existingSections.length > 0
      ? Number(existingSections[0].sort_order) + 10
      : 20;

  const nowIso = new Date().toISOString();

  const content = {
    body,
    level,
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
  };

  const status = "draft";

  const { data: insertedSection, error: insertError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "announcements",
      title,
      sort_order: nextSortOrder,
      status,
      content,
    })
    .select("id")
    .single();

  if (insertError || !insertedSection) {
    throw new Error(insertError?.message ?? "Не удалось создать announcement.");
  }

  const { error: versionError } = await supabase
    .from("content_versions")
    .insert({
      entity_type: "house_section",
      entity_id: insertedSection.id,
      version_number: 1,
      snapshot: {
        title,
        status,
        content,
      },
    });

  if (versionError) {
    throw new Error(
      `Объявление создано, но версия не сохранена: ${versionError.message}`,
    );
  }

  revalidatePath(`/admin/houses/${houseId}`);

  redirect(`/admin/houses/${houseId}`);
}
