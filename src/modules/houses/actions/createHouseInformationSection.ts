"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type CreateHouseInformationSectionState = {
  error: string | null;
};

const INFORMATION_IMAGES_BUCKET = "house-information-images";
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

const ALLOWED_CATEGORIES = [
  "О доме",
  "Правила проживания",
  "Полезная информация",
  "Контакты служб",
  "Инструкции для жильцов",
];

function normalizeCategory(value: string) {
  return ALLOWED_CATEGORIES.includes(value) ? value : ALLOWED_CATEGORIES[0];
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function createHouseInformationSection(
  _prevState: CreateHouseInformationSectionState,
  formData: FormData,
): Promise<CreateHouseInformationSectionState> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const housePageId = String(formData.get("housePageId") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = normalizeCategory(
    String(formData.get("category") ?? "").trim(),
  );
  const fileEntry = formData.get("coverImage");
  const coverImage =
    isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;
  const isPinned = String(formData.get("isPinned") ?? "").trim() === "true";

  if (!houseId || !houseSlug || !housePageId) {
    return { error: "Не переданы идентификаторы дома или страницы." };
  }

  if (!headline) {
    return { error: "Введите заголовок сообщения." };
  }

  if (!body) {
    return { error: "Введите текст сообщения." };
  }

  if (body.length > 256) {
    return { error: "Текст сообщения не должен превышать 256 символов." };
  }

  if (coverImage) {
    if (!ALLOWED_COVER_IMAGE_TYPES.has(coverImage.type)) {
      return {
        error: "Для обложки допускаются только JPG, PNG или WebP.",
      };
    }

    if (coverImage.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      return {
        error: "Обложка сообщения должна быть не больше 5 МБ.",
      };
    }
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingOrders, error: orderError } = await supabase
    .from("house_sections")
    .select("sort_order")
    .eq("house_page_id", housePageId)
    .eq("kind", "rich_text")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (orderError) {
    return {
      error: `Ошибка определения позиции сообщения: ${orderError.message}`,
    };
  }

  const nextSortOrder =
    existingOrders && existingOrders.length > 0
      ? Number(existingOrders[0].sort_order) + 10
      : 10;

  let coverImageUrl: string | null = null;

  const content = {
    headline,
    body,
    category,
    coverImageUrl,
    isPinned,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
  };

  const { data: section, error: createError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "rich_text",
      title: headline,
      sort_order: nextSortOrder,
      status: "draft",
      content,
    })
    .select("id")
    .single();

  if (createError || !section) {
    return {
      error: `Ошибка создания сообщения: ${createError?.message ?? "Unknown error"}`,
    };
  }

  if (coverImage) {
    const fileExt = coverImage.name.split(".").pop() || "jpg";
    const filePath = `${houseId}/${section.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(INFORMATION_IMAGES_BUCKET)
      .upload(filePath, coverImage, {
        upsert: true,
        contentType: coverImage.type || undefined,
      });

    if (uploadError) {
      await supabase.from("house_sections").delete().eq("id", section.id);

      return {
        error: `Не удалось загрузить обложку сообщения: ${uploadError.message}`,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from(INFORMATION_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    coverImageUrl = publicUrlData.publicUrl;

    content.coverImageUrl = coverImageUrl;

    const { error: updateSectionError } = await supabase
      .from("house_sections")
      .update({
        content,
      })
      .eq("id", section.id);

    if (updateSectionError) {
      await supabase.storage.from(INFORMATION_IMAGES_BUCKET).remove([filePath]);
      await supabase.from("house_sections").delete().eq("id", section.id);

      return {
        error: `Не удалось сохранить обложку сообщения: ${updateSectionError.message}`,
      };
    }
  }

  await supabase.from("content_versions").insert({
    entity_type: "house_section",
    entity_id: section.id,
    version_number: 1,
    snapshot: {
      title: headline,
      status: "draft",
      content,
    },
  });

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
    entityId: section.id,
    entityLabel: headline,
    actionType: "create_house_information_post",
    description: `Создан информационный блок «${headline}».`,
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "information",
      entityType: "house_section",
      entityId: section.id,
      entityTitle: headline,
      houseId,
      kind: "rich_text",
      category,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);

  return { error: null };
}
