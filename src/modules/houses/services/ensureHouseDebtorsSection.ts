import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

const DEFAULT_CONTENT = {
  activeItems: [],
  draftItems: [],
  payment: {
    url: "",
    title: "Оплата заборгованості",
    note: "",
    buttonLabel: "Сплатити",
  },
  calculator: {
    enabled: false,
    courtFee: "302.80",
    legalAid: "1000",
    inflationRate: "20",
    enforcementRate: "10",
    title: "Калькулятор судових витрат",
    note: "Розрахуйте орієнтовну суму витрат, яку доведеться сплатити боржнику у разі примусового стягнення боргу через суд.",
    disclaimer: "Розрахунок є орієнтовним. Остаточна сума визначається судом.",
  },
};

export async function ensureHouseDebtorsSection(params: {
  housePageId: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("house_sections")
    .select("id")
    .eq("house_page_id", params.housePageId)
    .eq("kind", "debtors")
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("house_sections")
    .insert({
      house_page_id: params.housePageId,
      kind: "debtors",
      title: "Боржники",
      status: "published",
      sort_order: 140,
      content: DEFAULT_CONTENT,
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    throw new Error(
      `Failed to ensure debtors section: ${error?.message ?? "Unknown error"}`,
    );
  }

  return created.id;
}
