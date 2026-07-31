import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  HouseDebtorMonthRow,
  HouseDebtorMonthSnapshot,
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
  monthsInDebt?: number;
  seriesBroken?: boolean;
};

export type HouseDebtorMonthSnapshotSummary = {
  id: string;
  periodYear: number;
  periodMonth: number;
  revision: number;
  source:
    | "manual_import"
    | "buffer_1c"
    | "manual_edit"
    | "migration_legacy";
  status:
    | "draft"
    | "published"
    | "superseded"
    | "discarded";
  rowsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lockVersion: number;
  importMeta: Record<string, unknown>;
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
  monthSnapshots: HouseDebtorMonthSnapshotSummary[];
  draftMonthSnapshots: HouseDebtorMonthSnapshotSummary[];
  latestPublishedMonth: HouseDebtorMonthSnapshotSummary | null;
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

function mapMonthSnapshot(
  snapshot: HouseDebtorMonthSnapshot,
  rowsCount: number,
): HouseDebtorMonthSnapshotSummary {
  return {
    id: snapshot.id,
    periodYear: snapshot.period_year,
    periodMonth: snapshot.period_month,
    revision: snapshot.revision,
    source: snapshot.source,
    status: snapshot.status,
    rowsCount,
    publishedAt: snapshot.published_at,
    createdAt: snapshot.created_at,
    updatedAt: snapshot.updated_at,
    lockVersion: snapshot.lock_version,
    importMeta: snapshot.import_meta ?? {},
  };
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

  const [
    itemsResult,
    monthSnapshotsResult,
    monthRowsResult,
  ] = await Promise.all([
    supabase
      .from("house_debtors_items")
      .select("*")
      .eq("house_id", params.houseId)
      .order("apartment_label", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("house_debtor_month_snapshots")
      .select("*")
      .eq("house_id", params.houseId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })
      .order("revision", { ascending: false }),
    supabase
      .from("house_debtor_month_rows")
      .select("snapshot_id")
      .eq("house_id", params.houseId),
  ]);

  if (itemsResult.error) {
    console.error(
      "Failed to load admin house debtors items:",
      itemsResult.error.message,
    );
  }

  if (monthSnapshotsResult.error) {
    console.error(
      "Failed to load admin debtor month snapshots:",
      monthSnapshotsResult.error.message,
    );
  }

  if (monthRowsResult.error) {
    console.error(
      "Failed to load admin debtor month row counts:",
      monthRowsResult.error.message,
    );
  }

  const itemsData = itemsResult.data;

  const mappedItems = ((itemsData ?? []) as unknown as HouseDebtorsItem[])
    .map(mapItem)
    .sort(sortItems);

  const monthRowCounts = new Map<string, number>();

  for (
    const row of
      (monthRowsResult.data ?? []) as Pick<
        HouseDebtorMonthRow,
        "snapshot_id"
      >[]
  ) {
    monthRowCounts.set(
      row.snapshot_id,
      (monthRowCounts.get(row.snapshot_id) ?? 0) + 1,
    );
  }

  const monthSnapshots = (
    (monthSnapshotsResult.data ?? []) as HouseDebtorMonthSnapshot[]
  ).map((snapshot) =>
    mapMonthSnapshot(
      snapshot,
      monthRowCounts.get(snapshot.id) ?? 0,
    ),
  );

  const draftMonthSnapshots = monthSnapshots.filter(
    (snapshot) => snapshot.status === "draft",
  );

  const latestPublishedMonth =
    monthSnapshots.find(
      (snapshot) => snapshot.status === "published",
    ) ?? null;

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
    monthSnapshots,
    draftMonthSnapshots,
    latestPublishedMonth,
  };
}
