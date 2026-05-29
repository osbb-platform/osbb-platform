export const HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE = "house_debtors_settings";
export const HOUSE_DEBTORS_ITEMS_ENTITY_TYPE = "house_debtors_items";

export type HouseDebtorsLifecycle = "draft" | "published" | "archived";

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
