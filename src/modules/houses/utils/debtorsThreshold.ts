export const DEBTOR_MIN_BALANCE_UAH = -500;

export function normalizeDebtorBalance(value: string | number | null | undefined) {
  const normalized = Number(
    String(value ?? "")
      .replace(/\s+/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(normalized) ? normalized : 0;
}

export function isAmountEligibleForDebtors(value: string | number | null | undefined) {
  return normalizeDebtorBalance(value) <= DEBTOR_MIN_BALANCE_UAH;
}
