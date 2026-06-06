import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HouseDebtorsItem,
  HouseDebtorsSettings,
} from "@/src/modules/content-engine/v2/handlers/debtors";

export type HouseDebtorsPaymentSnapshot = {
  url: string;
  title: string;
  note: string;
  buttonLabel: string;
};

export type HouseDebtorsCalculatorSnapshot = {
  enabled: boolean;
  courtFee: string;
  legalAid: string;
  inflationRate: string;
  enforcementRate: string;
  title: string;
  note: string;
  disclaimer: string;
};

export type HouseDebtorsItemSnapshot = {
  id: string;
  apartmentId: string | null;
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: number | null;
  amount: string;
  days: string;
  lifecycleStatus: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type AdminHouseDebtorsSnapshot = {
  settingsId: string | null;
  settingsLockVersion: number;
  updatedAt: string | null;
  payment: HouseDebtorsPaymentSnapshot;
  calculator: HouseDebtorsCalculatorSnapshot;
  activeItems: HouseDebtorsItemSnapshot[];
  draftItems: HouseDebtorsItemSnapshot[];
  archivedItems: HouseDebtorsItemSnapshot[];
};

export const DEFAULT_DEBTORS_PAYMENT: HouseDebtorsPaymentSnapshot = {
  url: "",
  title: "Оплата заборгованості",
  note: "",
  buttonLabel: "Сплатити",
};

export const DEFAULT_DEBTORS_CALCULATOR: HouseDebtorsCalculatorSnapshot = {
  enabled: false,
  courtFee: "302.80",
  legalAid: "1000",
  inflationRate: "20",
  enforcementRate: "10",
  title: "Калькулятор судових витрат",
  note: "",
  disclaimer: "",
};

function mapSettings(settings: HouseDebtorsSettings | null) {
  return {
    settingsId: settings?.id ?? null,
    settingsLockVersion: settings?.lock_version ?? 1,
    updatedAt: settings?.updated_at ?? null,
    payment: {
      url: settings?.payment_url ?? DEFAULT_DEBTORS_PAYMENT.url,
      title: settings?.payment_title ?? DEFAULT_DEBTORS_PAYMENT.title,
      note: settings?.payment_note ?? DEFAULT_DEBTORS_PAYMENT.note,
      buttonLabel:
        settings?.payment_button_label ??
        DEFAULT_DEBTORS_PAYMENT.buttonLabel,
    },
    calculator: {
      enabled:
        settings?.calculator_enabled ??
        DEFAULT_DEBTORS_CALCULATOR.enabled,
      courtFee:
        settings?.calculator_court_fee ??
        DEFAULT_DEBTORS_CALCULATOR.courtFee,
      legalAid:
        settings?.calculator_legal_aid ??
        DEFAULT_DEBTORS_CALCULATOR.legalAid,
      inflationRate:
        settings?.calculator_inflation_rate ??
        DEFAULT_DEBTORS_CALCULATOR.inflationRate,
      enforcementRate:
        settings?.calculator_enforcement_rate ??
        DEFAULT_DEBTORS_CALCULATOR.enforcementRate,
      title:
        settings?.calculator_title ??
        DEFAULT_DEBTORS_CALCULATOR.title,
      note:
        settings?.calculator_note ??
        DEFAULT_DEBTORS_CALCULATOR.note,
      disclaimer:
        settings?.calculator_disclaimer ??
        DEFAULT_DEBTORS_CALCULATOR.disclaimer,
    },
  };
}

function mapItem(item: HouseDebtorsItem): HouseDebtorsItemSnapshot {
  return {
    id: item.id,
    apartmentId: item.apartment_id,
    apartmentLabel: item.apartment_label,
    accountNumber: item.account_number,
    ownerName: item.owner_name,
    area:
      item.area === null || item.area === undefined
        ? null
        : Number(item.area),
    amount: item.amount,
    days: item.days,
    lifecycleStatus: item.lifecycle_status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function sortItems(
  left: HouseDebtorsItemSnapshot,
  right: HouseDebtorsItemSnapshot,
) {
  return left.apartmentLabel.localeCompare(right.apartmentLabel, "uk", {
    numeric: true,
  });
}

async function ensureSettings(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  houseId: string;
}) {
  const now = new Date().toISOString();

  const { data, error } = await params.supabase
    .from("house_debtors_settings")
    .upsert(
      {
        house_id: params.houseId,
        payment_url: DEFAULT_DEBTORS_PAYMENT.url,
        payment_title: DEFAULT_DEBTORS_PAYMENT.title,
        payment_note: DEFAULT_DEBTORS_PAYMENT.note,
        payment_button_label: DEFAULT_DEBTORS_PAYMENT.buttonLabel,
        calculator_enabled: DEFAULT_DEBTORS_CALCULATOR.enabled,
        calculator_court_fee: DEFAULT_DEBTORS_CALCULATOR.courtFee,
        calculator_legal_aid: DEFAULT_DEBTORS_CALCULATOR.legalAid,
        calculator_inflation_rate: DEFAULT_DEBTORS_CALCULATOR.inflationRate,
        calculator_enforcement_rate: DEFAULT_DEBTORS_CALCULATOR.enforcementRate,
        calculator_title: DEFAULT_DEBTORS_CALCULATOR.title,
        calculator_note: DEFAULT_DEBTORS_CALCULATOR.note,
        calculator_disclaimer: DEFAULT_DEBTORS_CALCULATOR.disclaimer,
        updated_at: now,
      },
      { onConflict: "house_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to ensure house debtors settings:", error.message);
    return null;
  }

  return (data ?? null) as HouseDebtorsSettings | null;
}

export async function getAdminHouseDebtors(params: {
  houseId: string;
}): Promise<AdminHouseDebtorsSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const settingsResult = await supabase
    .from("house_debtors_settings")
    .select("*")
    .eq("house_id", params.houseId)
    .maybeSingle();

  let settings = (settingsResult.data ?? null) as HouseDebtorsSettings | null;

  if (settingsResult.error) {
    console.error(
      "Failed to load admin house debtors settings:",
      settingsResult.error.message,
    );
  }

  if (!settings) {
    settings = await ensureSettings({
      supabase,
      houseId: params.houseId,
    });
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("house_debtors_items")
    .select("*")
    .eq("house_id", params.houseId)
    .order("apartment_label", { ascending: true })
    .order("updated_at", { ascending: false });

  if (itemsError) {
    console.error(
      "Failed to load admin house debtors items:",
      itemsError.message,
    );
  }

  const mappedItems = ((itemsData ?? []) as unknown as HouseDebtorsItem[])
    .map(mapItem)
    .sort(sortItems);

  const mappedSettings = mapSettings(settings);

  const latestItemsUpdatedAt =
    mappedItems.length > 0
      ? mappedItems
          .map((item) => item.updatedAt)
          .sort()
          .at(-1) ?? null
      : null;

  return {
    ...mappedSettings,
    updatedAt: latestItemsUpdatedAt ?? mappedSettings.updatedAt,
    activeItems: mappedItems.filter(
      (item) => item.lifecycleStatus === "published",
    ),
    draftItems: mappedItems.filter(
      (item) => item.lifecycleStatus === "draft",
    ),
    archivedItems: mappedItems.filter(
      (item) => item.lifecycleStatus === "archived",
    ),
  };
}
