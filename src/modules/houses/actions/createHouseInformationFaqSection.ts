"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type CreateHouseInformationFaqSectionState = {
  error: string | null;
};

function parseFaqPayload(formData: FormData) {
  const rawPayload = String(formData.get("faqPayload") ?? "").trim();

  if (!rawPayload) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawPayload) as Array<Record<string, unknown>>;
    return parsed
      .map((item) => ({
        question: String(item.question ?? "").trim(),
        answer: String(item.answer ?? "").trim(),
      }))
      .filter((item) => item.question || item.answer);
  } catch {
    return [];
  }
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function createHouseInformationFaqSection(
  _prevState: CreateHouseInformationFaqSectionState,
  formData: FormData,
): Promise<CreateHouseInformationFaqSectionState> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const housePageId = String(formData.get("housePageId") ?? "").trim();

  if (!houseId || !houseSlug || !housePageId) {
    return { error: "Не переданы идентификаторы дома или страницы." };
  }

  const items = parseFaqPayload(formData);

  const supabase = await createSupabaseServerClient();

  const content = {
    items,
    updatedAt: new Date().toISOString(),
  };

  const { data: existingFaq } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "faq")
    .neq("status", "published")
    .maybeSingle();

  let sectionId = existingFaq?.id ?? null;

  if (sectionId) {
    const { error: updateError } = await supabase
      .from("house_sections")
      .update({
        title: "FAQ",
        status: "draft",
        content,
      })
      .eq("id", sectionId);

    if (updateError) {
      return {
        error: `Ошибка обновления FAQ: ${updateError.message}`,
      };
    }
  } else {
    const { data: section, error: createError } = await supabase
      .from("house_sections")
      .insert({
        house_page_id: housePageId,
        kind: "faq",
        title: "FAQ",
        sort_order: 100,
        status: "draft",
        content,
      })
      .select("id")
      .single();

    if (createError || !section) {
      return {
        error: `Ошибка создания FAQ: ${createError?.message ?? "Unknown error"}`,
      };
    }

    sectionId = section.id;
  }

  await supabase.from("content_versions").insert({
    entity_type: "house_section",
    entity_id: sectionId,
    version_number: 1,
    snapshot: {
      title: "FAQ",
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
    entityId: sectionId,
    entityLabel: "FAQ",
    actionType: "create_house_information_faq",
    description: "Создан FAQ блок.",
    houseId,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "houses",
      subSectionKey: "faq",
      entityType: "house_section",
      entityId: sectionId,
      entityTitle: "FAQ",
      houseId,
      kind: "faq",
      itemsCount: items.length,
    },
  });

  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath(`/house/${houseSlug}/information`);

  return { error: null };
}
