import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

const DEFAULT_TEMPLATE =
  "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}";

export async function ensureHouseRequisitesSection(params: {
  housePageId: string;
}) {
  const { housePageId } = params;
  const supabase = await createSupabaseServerClient();

  const { data: existingSection, error: existingError } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", housePageId)
    .eq("kind", "requisites")
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check requisites section: ${existingError.message}`,
    );
  }

  if (existingSection?.id) {
    return existingSection.id;
  }

  const now = new Date().toISOString();

  const { data: createdSection, error: createError } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: housePageId,
      kind: "requisites",
      title: "Реквизиты",
      sort_order: 160,
      status: "published",
      content: {
        recipient: "",
        iban: "",
        edrpou: "",
        bank: "",
        purposeTemplate: DEFAULT_TEMPLATE,
        paymentUrl: "",
        paymentButtonLabel: "Перейти к оплате",
        updatedAt: now,
      },
    })
    .select("id")
    .single();

  if (createError || !createdSection?.id) {
    throw new Error(
      `Failed to create requisites section: ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdSection.id;
}
