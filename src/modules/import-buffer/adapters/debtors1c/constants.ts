/**
 * Every parser constant in this file is derived from:
 * docs/import-buffer/1c-format-notes.md
 *
 * Extend only after another real 1C fixture proves a new variation.
 */

export const DEBTORS_1C_ADAPTER_KEY = "debtors_1c" as const;

export const DEBTORS_1C_TITLE_MARKER =
  "Коротка зведена відомість за";

export const DEBTORS_1C_PROVEN_MONTHS: Readonly<
  Record<string, number>
> = {
  травень: 5,
};

export const DEBTORS_1C_HEADER_LABELS = {
  account: "Особ.рахунок",
  apartment: "Кв-ра",
  owner: "Квартиронаймач",
  area: "Площа",
  opening: "Сума на початок місяця",
  accrued: "Разом нараховано",
  paid: "Разом сплачено",
  closing: "Сума на кінець місяця",
  debt: "Борг",
} as const;

export const DEBTORS_1C_ACCOUNT_PREFIXES = [
  "л/с",
] as const;

export const DEBTORS_1C_ACCOUNT_SYMBOLS = [
  "№",
] as const;

export const DEBTORS_1C_NON_RESIDENTIAL_MARKER =
  "(нежитлові)";

export const DEBTORS_1C_PROVIDER_MARKER =
  "(провайдери)";

export const DEBTORS_1C_SERVICE_LABEL_PREFIXES = [
  "МЗК",
] as const;

export const DEBTORS_1C_TOTAL_MARKER = "Всього:";

/**
 * P10 T1 evidence:
 * docs/import-buffer/unmatched-accounts-audit.md
 *
 * A technical account is identified by row semantics, never by
 * account-number suffix.
 */
export const DEBTORS_1C_TECHNICAL_APARTMENT_LABEL =
  "Кв. 999";

export const DEBTORS_1C_TECHNICAL_AREA = 0;

export const DEBTORS_1C_TECHNICAL_OWNER_MARKERS = [
  "Квартира",
  "незясовані 999",
] as const;
