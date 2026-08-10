import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
  HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE,
  type DebtorsCalculatorPayload,
  type DebtorsPaymentPayload,
  type HouseDebtorsSettings,
  type SaveDebtorsDraftItemPayload,
} from "../types";

export {
  HOUSE_DEBTORS_ITEMS_ENTITY_TYPE,
  HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE,
};

export const DEFAULT_DEBTORS_PAYMENT = {
  url: "",
  title: "Оплата заборгованості",
  note: "",
  buttonLabel: "Сплатити",
};

export const DEFAULT_DEBTORS_CALCULATOR = {
  enabled: false,
  courtFee: "302.80",
  legalAid: "1000",
  inflationRate: "20",
  enforcementRate: "10",
  title: "Калькулятор судових витрат",
  note: "",
  disclaimer: "",
};

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeFallbackText(value: unknown, fallback: string) {
  return normalizeText(value) || fallback;
}

export function normalizeNullableUuid(value: unknown) {
  const text = normalizeText(value);

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

export function normalizeArea(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function normalizePayment(
  value: DebtorsPaymentPayload | undefined,
  fallback?: HouseDebtorsSettings | null,
) {
  return {
    url: normalizeText(value?.url ?? fallback?.payment_url ?? DEFAULT_DEBTORS_PAYMENT.url),
    title: normalizeFallbackText(
      value?.title ?? fallback?.payment_title,
      DEFAULT_DEBTORS_PAYMENT.title,
    ),
    note: normalizeText(value?.note ?? fallback?.payment_note ?? DEFAULT_DEBTORS_PAYMENT.note),
    buttonLabel: normalizeFallbackText(
      value?.buttonLabel ?? fallback?.payment_button_label,
      DEFAULT_DEBTORS_PAYMENT.buttonLabel,
    ),
  };
}

export function normalizeCalculator(
  value: DebtorsCalculatorPayload | undefined,
  fallback?: HouseDebtorsSettings | null,
) {
  return {
    enabled: Boolean(value?.enabled ?? fallback?.calculator_enabled ?? DEFAULT_DEBTORS_CALCULATOR.enabled),
    courtFee: normalizeFallbackText(
      value?.courtFee ?? fallback?.calculator_court_fee,
      DEFAULT_DEBTORS_CALCULATOR.courtFee,
    ),
    legalAid: normalizeFallbackText(
      value?.legalAid ?? fallback?.calculator_legal_aid,
      DEFAULT_DEBTORS_CALCULATOR.legalAid,
    ),
    inflationRate: normalizeFallbackText(
      value?.inflationRate ?? fallback?.calculator_inflation_rate,
      DEFAULT_DEBTORS_CALCULATOR.inflationRate,
    ),
    enforcementRate: normalizeFallbackText(
      value?.enforcementRate ?? fallback?.calculator_enforcement_rate,
      DEFAULT_DEBTORS_CALCULATOR.enforcementRate,
    ),
    title: normalizeFallbackText(
      value?.title ?? fallback?.calculator_title,
      DEFAULT_DEBTORS_CALCULATOR.title,
    ),
    note: normalizeText(value?.note ?? fallback?.calculator_note ?? DEFAULT_DEBTORS_CALCULATOR.note),
    disclaimer: normalizeText(
      value?.disclaimer ??
        fallback?.calculator_disclaimer ??
        DEFAULT_DEBTORS_CALCULATOR.disclaimer,
    ),
  };
}

export function normalizeDraftItems(value: unknown): SaveDebtorsDraftItemPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: SaveDebtorsDraftItemPayload[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;
    const apartmentLabel = normalizeText(raw.apartmentLabel);
    const amount = normalizeText(raw.amount);

    if (!apartmentLabel || !amount) {
      continue;
    }

    items.push({
      apartmentId: normalizeNullableUuid(raw.apartmentId),
      apartmentLabel,
      accountNumber: normalizeText(raw.accountNumber),
      ownerName: normalizeText(raw.ownerName),
      area: normalizeArea(raw.area),
      amount,
      days: normalizeText(raw.days),
    });
  }

  return items;
}

export async function getDebtorsSettings(
  ctx: HandlerContext,
): Promise<Result<HouseDebtorsSettings | null>> {
  const { data, error } = await ctx.supabase
    .from("house_debtors_settings")
    .select("*")
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok((data ?? null) as HouseDebtorsSettings | null);
}

export async function ensureDebtorsSettings(
  ctx: HandlerContext,
): Promise<Result<HouseDebtorsSettings>> {
  const existing = await getDebtorsSettings(ctx);
  if (!existing.ok) return existing;
  if (existing.data) return ok(existing.data);

  const now = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("house_debtors_settings")
    .insert({
      house_id: ctx.house.id,
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
      lock_version: 1,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return err(error?.message ?? "Не вдалося створити налаштування боржників.", "INTERNAL");
  }

  return ok(data as HouseDebtorsSettings);
}

export function publicDebtorsPaths(houseSlug: string) {
  return [`/house/${houseSlug}/debtors`, `/house/${houseSlug}`];
}

export function debtorsHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "debtors",
    ...extra,
  };
}
