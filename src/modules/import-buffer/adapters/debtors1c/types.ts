export interface Debtors1cRow {
  accountNumberRaw: string;
  accountNumberNormalized: string;
  apartmentLabel: string | null;
  ownerName: string | null;
  area: number | null;
  openingBalance: number | null;
  accrued: number | null;
  paid: number | null;
  closingBalance: number | null;
  debtValue: number | null;
  osbbBalance: number | null;
}

export type Debtors1cGroupKind =
  | "none"
  | "non_residential"
  | "providers"
  | "residential";
