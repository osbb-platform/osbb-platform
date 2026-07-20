import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HouseDebtorsItem,
  HouseDebtorsSettings,
} from "@/src/modules/content-engine/v2/handlers/debtors";
import {
  DEFAULT_DEBTORS_CALCULATOR,
  DEFAULT_DEBTORS_PAYMENT,
  type AdminHouseDebtorsSnapshot,
  type HouseDebtorsItemSnapshot,
} from "./getAdminHouseDebtors";

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

function emptySnapshot(): AdminHouseDebtorsSnapshot {
  return {
    ...mapSettings(null),
    updatedAt: null,
    activeItems: [],
    draftItems: [],
    archivedItems: [],
    monthSnapshots: [],
    draftMonthSnapshots: [],
    latestPublishedMonth: null,
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

async function loadPublishedHouseDebtors(
  houseId: string,
): Promise<AdminHouseDebtorsSnapshot> {
  const supabase = createSupabasePublicClient();

  const [settingsResult, itemsResult] = await Promise.all([
    supabase
      .from("house_debtors_settings")
      .select("*")
      .eq("house_id", houseId)
      .maybeSingle(),
    supabase
      .from("house_debtors_items")
      .select("*")
      .eq("house_id", houseId)
      .eq("lifecycle_status", "published")
      .order("apartment_label", { ascending: true })
      .order("updated_at", { ascending: false }),
  ]);

  if (settingsResult.error) {
    console.error("Failed to load published debtors settings:", {
      houseId,
      message: settingsResult.error.message,
    });
    return emptySnapshot();
  }

  if (itemsResult.error) {
    console.error("Failed to load published debtors items:", {
      houseId,
      message: itemsResult.error.message,
    });
    return emptySnapshot();
  }

  const settings = (settingsResult.data ?? null) as HouseDebtorsSettings | null;
  const activeItems = ((itemsResult.data ?? []) as unknown as HouseDebtorsItem[])
    .map(mapItem)
    .sort(sortItems);

  const mappedSettings = mapSettings(settings);

  const latestItemsUpdatedAt =
    activeItems.length > 0
      ? activeItems
          .map((item) => item.updatedAt)
          .sort()
          .at(-1) ?? null
      : null;

  return {
    ...mappedSettings,
    updatedAt: latestItemsUpdatedAt ?? mappedSettings.updatedAt,
    activeItems,
    draftItems: [],
    archivedItems: [],
    monthSnapshots: [],
    draftMonthSnapshots: [],
    latestPublishedMonth: null,
  };
}

export const getPublishedHouseDebtors = cache(
  async (houseId: string): Promise<AdminHouseDebtorsSnapshot> => {
    return unstable_cache(
      () => loadPublishedHouseDebtors(houseId),
      ["published-house-debtors", houseId],
      {
        tags: [`house:${houseId}:debtors`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
