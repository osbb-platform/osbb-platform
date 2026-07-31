
export const HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE = "house_debtors_settings";
export const HOUSE_DEBTORS_ITEMS_ENTITY_TYPE = "house_debtors_items";
export const HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE =
  "house_debtor_month_snapshot";

export type HouseDebtorsLifecycle = "draft" | "published" | "archived";

export type HouseDebtorMonthSource =
  | "manual_import"
  | "buffer_1c"
  | "manual_edit"
  | "migration_legacy";

export type HouseDebtorMonthStatus =
  | "draft"
  | "published"
  | "superseded"
  | "discarded";

export type HouseDebtorsSettings = {
  id: string;
  house_id: string;
  payment_url: string;
  payment_title: string;
  payment_note: string;
  payment_button_label: string;
  calculator_enabled: boolean;
  calculator_court_fee: string;
  calculator_legal_aid: string;
  calculator_inflation_rate: string;
  calculator_enforcement_rate: string;
  calculator_title: string;
  calculator_note: string;
  calculator_disclaimer: string;
  lock_version: number;
  created_at: string;
  updated_at: string;
};

export type HouseDebtorsItem = {
  id: string;
  house_id: string;
  apartment_id: string | null;
  apartment_label: string;
  account_number: string;
  owner_name: string;
  area: number | null;
  amount: string;
  days: string;
  lifecycle_status: HouseDebtorsLifecycle;
  created_at: string;
  updated_at: string;
};

export type HouseDebtorMonthSnapshot = {
  id: string;
  house_id: string;
  period_year: number;
  period_month: number;
  revision: number;
  source: HouseDebtorMonthSource;
  import_meta: Record<string, unknown>;
  status: HouseDebtorMonthStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lock_version: number;
};

export type HouseDebtorMonthRow = {
  id: string;
  snapshot_id: string;
  house_id: string;
  apartment_id: string | null;
  account_number: string;
  apartment_label: string;
  owner_name: string;
  area: number | null;
  accrued: number | null;
  paid: number | null;
  closing_balance: number;
  debt_source_value: number | null;
};

export type HouseDebtorMonthSnapshotWithRows = {
  snapshot: HouseDebtorMonthSnapshot;
  rows: HouseDebtorMonthRow[];
};

export type DebtorsPaymentPayload = {
  url?: string;
  title?: string;
  note?: string;
  buttonLabel?: string;
};

export type DebtorsCalculatorPayload = {
  enabled?: boolean;
  courtFee?: string;
  legalAid?: string;
  inflationRate?: string;
  enforcementRate?: string;
  title?: string;
  note?: string;
  disclaimer?: string;
};

export type SaveDebtorsSettingsPayload = {
  lockVersion?: number;
  payment?: DebtorsPaymentPayload;
  calculator?: DebtorsCalculatorPayload;
};

export type SaveDebtorsDraftItemPayload = {
  apartmentId?: string | null;
  apartmentLabel: string;
  accountNumber?: string;
  ownerName?: string;
  area?: number | null;
  amount: string;
  days?: string;
};

export type SaveDebtorsDraftItemsPayload = {
  items: SaveDebtorsDraftItemPayload[];
};

export type ImportMonthDraftRowPayload = {
  accountNumber: string;
  accrued?: number | null;
  paid?: number | null;
  closingBalance: number;
  debtSourceValue?: number | null;
};

export type ImportMonthDraftPayload = {
  periodYear: number;
  periodMonth: number;
  source?: Exclude<HouseDebtorMonthSource, "migration_legacy">;
  importMeta?: Record<string, unknown>;
  rows: ImportMonthDraftRowPayload[];
};

export type MonthSnapshotIdAndLockPayload = {
  id: string;
  lockVersion: number;
};

export type RelabelMonthSnapshotPayload =
  MonthSnapshotIdAndLockPayload & {
    periodYear: number;
    periodMonth: number;
  };
