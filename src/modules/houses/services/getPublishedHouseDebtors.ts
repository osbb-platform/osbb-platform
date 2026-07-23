import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import { throwRequiredPublicReadError } from "./publicContentResilience";
import type { HouseDebtorsSettings } from "@/src/modules/content-engine/v2/handlers/debtors";
import {
  DEFAULT_DEBTORS_CALCULATOR,
  DEFAULT_DEBTORS_PAYMENT,
  type AdminHouseDebtorsSnapshot,
  type HouseDebtorsItemSnapshot,
} from "./getAdminHouseDebtors";

type PublicDebtorHistoryRow = {
  period_year: number;
  period_month: number;
  revision: number;
  published_at: string | null;
  snapshot_updated_at: string;
  row_id: string;
  apartment_id: string | null;
  account_number: string;
  apartment_label: string;
  owner_name: string;
  area: number | null;
  closing_balance: number;
  months_in_debt: number;
  series_broken: boolean;
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
      buttonLabel: settings?.payment_button_label ?? DEFAULT_DEBTORS_PAYMENT.buttonLabel,
    },
    calculator: {
      enabled: settings?.calculator_enabled ?? DEFAULT_DEBTORS_CALCULATOR.enabled,
      courtFee: settings?.calculator_court_fee ?? DEFAULT_DEBTORS_CALCULATOR.courtFee,
      legalAid: settings?.calculator_legal_aid ?? DEFAULT_DEBTORS_CALCULATOR.legalAid,
      inflationRate: settings?.calculator_inflation_rate ?? DEFAULT_DEBTORS_CALCULATOR.inflationRate,
      enforcementRate: settings?.calculator_enforcement_rate ?? DEFAULT_DEBTORS_CALCULATOR.enforcementRate,
      title: settings?.calculator_title ?? DEFAULT_DEBTORS_CALCULATOR.title,
      note: settings?.calculator_note ?? DEFAULT_DEBTORS_CALCULATOR.note,
      disclaimer: settings?.calculator_disclaimer ?? DEFAULT_DEBTORS_CALCULATOR.disclaimer,
    },
  };
}


function formatBalance(value: number) {
  const fixed = value.toFixed(2);
  if (fixed.endsWith(".00")) return fixed.slice(0, -3);
  if (fixed.endsWith("0")) return fixed.slice(0, -1);
  return fixed;
}

function mapItem(row: PublicDebtorHistoryRow): HouseDebtorsItemSnapshot {
  return {
    id: row.row_id,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
    accountNumber: row.account_number,
    ownerName: row.owner_name,
    area: row.area === null ? null : Number(row.area),
    amount: formatBalance(Number(row.closing_balance)),
    days: String(row.months_in_debt),
    lifecycleStatus: "published",
    createdAt: row.published_at ?? row.snapshot_updated_at,
    updatedAt: row.snapshot_updated_at,
    monthsInDebt: Number(row.months_in_debt),
    seriesBroken: Boolean(row.series_broken),
  };
}

async function loadPublishedHouseDebtors(
  houseId: string,
): Promise<AdminHouseDebtorsSnapshot> {
  const supabase = createSupabasePublicClient();
  const [settingsResult, historyResult] = await Promise.all([
    supabase
      .from("house_debtors_settings")
      .select("*")
      .eq("house_id", houseId)
      .maybeSingle(),
    supabase.rpc("get_public_house_debtor_history", {
      p_house_id: houseId,
    }),
  ]);

  if (settingsResult.error) {
    throwRequiredPublicReadError({
      section: "debtors",
      resource: "house_debtors_settings",
      houseId,
      error: settingsResult.error,
    });
  }

  if (historyResult.error) {
    throwRequiredPublicReadError({
      section: "debtors",
      resource: "get_public_house_debtor_history",
      houseId,
      error: historyResult.error,
    });
  }

  const settings = (settingsResult.data ?? null) as HouseDebtorsSettings | null;
  const rows = (historyResult.data ?? []) as PublicDebtorHistoryRow[];
  const activeItems = rows.map(mapItem).sort((left, right) =>
    left.apartmentLabel.localeCompare(right.apartmentLabel, "uk", { numeric: true }),
  );
  const latest = rows[0] ?? null;
  const latestPublishedMonth = latest
    ? {
        id: `public-${houseId}-${latest.period_year}-${latest.period_month}`,
        periodYear: latest.period_year,
        periodMonth: latest.period_month,
        revision: latest.revision,
        source: "manual_import" as const,
        status: "published" as const,
        rowsCount: rows.length,
        publishedAt: latest.published_at,
        createdAt: latest.published_at ?? latest.snapshot_updated_at,
        updatedAt: latest.snapshot_updated_at,
        lockVersion: 1,
        importMeta: {},
      }
    : null;

  return {
    ...mapSettings(settings),
    updatedAt: latest?.published_at ?? latest?.snapshot_updated_at ?? settings?.updated_at ?? null,
    activeItems,
    draftItems: [],
    archivedItems: [],
    monthSnapshots: latestPublishedMonth ? [latestPublishedMonth] : [],
    draftMonthSnapshots: [],
    latestPublishedMonth,
  };
}

export const getPublishedHouseDebtors = cache(
  async (houseId: string): Promise<AdminHouseDebtorsSnapshot> =>
    unstable_cache(
      () => loadPublishedHouseDebtors(houseId),
      ["published-house-debtors-v2", houseId],
      {
        tags: [`house:${houseId}:debtors`, `house:${houseId}`],
        revalidate: 300,
      },
    )(),
);
