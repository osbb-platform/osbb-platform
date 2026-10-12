import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { readAllCountedPages } from "@/src/shared/data/readAllCountedPages";
import type {
  HouseDebtorMonthRow,
  HouseDebtorMonthSnapshot,
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
  latestPublishedItems?: HouseDebtorsItemSnapshot[];
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

function sortItems(
  left: HouseDebtorsItemSnapshot,
  right: HouseDebtorsItemSnapshot,
) {
  return left.apartmentLabel.localeCompare(right.apartmentLabel, "uk", {
    numeric: true,
  });
}

function mapMonthRowItem(params: {
  row: HouseDebtorMonthRow;
  snapshot: HouseDebtorMonthSnapshotSummary;
  lifecycleStatus: "draft" | "published";
}): HouseDebtorsItemSnapshot {
  const { row, snapshot, lifecycleStatus } = params;

  return {
    id: row.id,
    apartmentId: row.apartment_id,
    apartmentLabel: row.apartment_label,
    accountNumber: row.account_number,
    ownerName: row.owner_name,
    area: row.area === null ? null : Number(row.area),
    amount: String(Number(row.closing_balance)),
    days: "",
    lifecycleStatus,
    createdAt:
      snapshot.publishedAt ??
      snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
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
    throw new Error("Не вдалося завантажити налаштування боржників.");
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
    throw new Error("Не вдалося завантажити налаштування боржників.");
  }

  if (!settings) {
    settings = await ensureSettings({
      supabase,
      houseId: params.houseId,
    });
  }

  let snapshotRows: HouseDebtorMonthSnapshot[];

  try {
    snapshotRows = await readAllCountedPages<HouseDebtorMonthSnapshot>({
      label: "admin debtor month snapshots",
      getRowKey: (snapshot) => snapshot.id,
      fetchPage: async (from, to) => {
        const result = await supabase
          .from("house_debtor_month_snapshots")
          .select("*", { count: "exact" })
          .eq("house_id", params.houseId)
          .order("period_year", { ascending: false })
          .order("period_month", { ascending: false })
          .order("revision", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as HouseDebtorMonthSnapshot[],
          error: result.error,
          count: result.count,
        };
      },
    });
  } catch (error) {
    console.error("Failed to load complete admin debtor snapshots:", error);
    throw new Error(
      "Не вдалося повністю завантажити історію боржників. Повторіть спробу.",
    );
  }

  const monthRowCounts = new Map(
    snapshotRows.map((snapshot) => [snapshot.id, 0]),
  );

  try {
    const countedRows = await readAllCountedPages<{
      id: string;
      snapshot_id: string;
    }>({
      label: "admin debtor snapshot row counts",
      getRowKey: (row) => row.id,
      fetchPage: async (from, to) => {
        const result = await supabase
          .from("house_debtor_month_rows")
          .select("id, snapshot_id", { count: "exact" })
          .eq("house_id", params.houseId)
          .order("snapshot_id", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);

        return {
          data: (result.data ?? []) as {
            id: string;
            snapshot_id: string;
          }[],
          error: result.error,
          count: result.count,
        };
      },
    });

    for (const row of countedRows) {
      const currentCount = monthRowCounts.get(row.snapshot_id);
      if (currentCount === undefined) {
        throw new Error("Snapshot set changed during admin read");
      }

      monthRowCounts.set(row.snapshot_id, currentCount + 1);
    }
  } catch (error) {
    console.error("Failed to load exact admin debtor row counts:", error);
    throw new Error(
      "Не вдалося перевірити кількість рядків історії боржників.",
    );
  }

  const monthSnapshots = snapshotRows.map((snapshot) =>
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

  const latestDraftMonth = draftMonthSnapshots[0] ?? null;
  const currentSnapshotIds = [
    latestPublishedMonth?.id ?? null,
    latestDraftMonth?.id ?? null,
  ].filter((value): value is string => Boolean(value));
  const currentRowsBySnapshot = new Map<string, HouseDebtorMonthRow[]>();

  try {
    await Promise.all(
      [...new Set(currentSnapshotIds)].map(async (snapshotId) => {
        const rows = await readAllCountedPages<HouseDebtorMonthRow>({
          label: `admin debtor snapshot rows ${snapshotId}`,
          getRowKey: (row) => row.id,
          fetchPage: async (from, to) => {
            const result = await supabase
              .from("house_debtor_month_rows")
              .select(
                "id, snapshot_id, house_id, apartment_id, account_number, apartment_label, owner_name, area, accrued, paid, closing_balance, debt_source_value",
                { count: "exact" },
              )
              .eq("house_id", params.houseId)
              .eq("snapshot_id", snapshotId)
              .order("account_number", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to);

            return {
              data: (result.data ?? []) as HouseDebtorMonthRow[],
              error: result.error,
              count: result.count,
            };
          },
        });

        if (rows.length !== (monthRowCounts.get(snapshotId) ?? 0)) {
          throw new Error("Snapshot row count changed during admin read");
        }

        currentRowsBySnapshot.set(snapshotId, rows);
      }),
    );
  } catch (error) {
    console.error("Failed to load complete current debtor rows:", error);
    throw new Error(
      "Не вдалося повністю завантажити актуальні рядки боржників.",
    );
  }

  const latestPublishedItems = latestPublishedMonth
    ? (currentRowsBySnapshot.get(latestPublishedMonth.id) ?? [])
        .map((row) =>
          mapMonthRowItem({
            row,
            snapshot: latestPublishedMonth,
            lifecycleStatus: "published",
          }),
        )
        .sort(sortItems)
    : [];

  const latestDraftItems = latestDraftMonth
    ? (currentRowsBySnapshot.get(latestDraftMonth.id) ?? [])
        .map((row) =>
          mapMonthRowItem({
            row,
            snapshot: latestDraftMonth,
            lifecycleStatus: "draft",
          }),
        )
        .sort(sortItems)
    : [];

  const mappedSettings = mapSettings(settings);

  const snapshotUpdatedAt = [
    latestPublishedMonth?.updatedAt ?? null,
    latestDraftMonth?.updatedAt ?? null,
  ]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    ...mappedSettings,
    updatedAt: snapshotUpdatedAt ?? mappedSettings.updatedAt,
    activeItems: latestPublishedItems,
    draftItems: latestDraftItems,
    archivedItems: [],
    latestPublishedItems,
    monthSnapshots,
    draftMonthSnapshots,
    latestPublishedMonth,
  };
}
