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

type ResidentDebtorsPayload = {
  settings?: HouseDebtorsSettings | null;
  items?: HouseDebtorsItem[];
};

function mapSettings(
  settings: HouseDebtorsSettings | null,
) {
  return {
    settingsId: settings?.id ?? null,
    settingsLockVersion:
      settings?.lock_version ?? 1,
    updatedAt: settings?.updated_at ?? null,
    payment: {
      url:
        settings?.payment_url ??
        DEFAULT_DEBTORS_PAYMENT.url,
      title:
        settings?.payment_title ??
        DEFAULT_DEBTORS_PAYMENT.title,
      note:
        settings?.payment_note ??
        DEFAULT_DEBTORS_PAYMENT.note,
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
  };
}

function mapItem(
  item: HouseDebtorsItem,
): HouseDebtorsItemSnapshot {
  return {
    id: item.id,
    apartmentId: item.apartment_id,
    apartmentLabel: item.apartment_label,
    accountNumber: item.account_number,
    ownerName: "",
    area:
      item.area === null ||
      item.area === undefined
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
  return left.apartmentLabel.localeCompare(
    right.apartmentLabel,
    "uk",
    {
      numeric: true,
    },
  );
}

export async function getPublishedHouseDebtors({
  houseId,
  sessionToken,
}: {
  houseId: string;
  sessionToken: string;
}): Promise<AdminHouseDebtorsSnapshot> {
  if (!houseId.trim() || !sessionToken.trim()) {
    return emptySnapshot();
  }

  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc(
    "get_resident_house_debtors",
    {
      target_house_id: houseId,
      target_session_token: sessionToken,
    },
  );

  if (error) {
    console.error(
      "[resident-debtors] RPC failed",
      {
        houseId,
        message: error.message,
      },
    );

    return emptySnapshot();
  }

  if (!data || typeof data !== "object") {
    return emptySnapshot();
  }

  const payload =
    data as unknown as ResidentDebtorsPayload;

  const settings =
    payload.settings &&
    typeof payload.settings === "object"
      ? payload.settings
      : null;

  const activeItems = (
    Array.isArray(payload.items)
      ? payload.items
      : []
  )
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
    updatedAt:
      latestItemsUpdatedAt ??
      mappedSettings.updatedAt,
    activeItems,
    draftItems: [],
    archivedItems: [],
  };
}
