"use client";

import { useMemo, useState } from "react";

type CalculatorSettings = {
  enabled: boolean;
  courtFee: string;
  legalAid: string;
  inflationRate: string;
  enforcementRate: string;
  title: string;
  note: string;
  disclaimer: string;
};

function parseNumber(value: string) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

type Props = {
  calculator: CalculatorSettings | null;
  hasPublishedDebtors: boolean;
};

const INFO_TILE =
  "rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]";

export function PublicDebtorsCalculatorBlock({
  calculator,
  hasPublishedDebtors,
}: Props) {
  const [debtAmount, setDebtAmount] = useState("");

  const result = useMemo(() => {
    if (!calculator || !calculator.enabled || !hasPublishedDebtors) {
      return null;
    }

    const baseDebt = parseNumber(debtAmount);
    const courtFee = parseNumber(calculator.courtFee);
    const legalAid = parseNumber(calculator.legalAid);
    const inflationRate = parseNumber(calculator.inflationRate);
    const enforcementRate = parseNumber(calculator.enforcementRate);

    const inflationAmount = (baseDebt * inflationRate) / 100;
    const subtotal = baseDebt + courtFee + legalAid + inflationAmount;
    const enforcementAmount = (subtotal * enforcementRate) / 100;
    const total = subtotal + enforcementAmount;

    return {
      baseDebt,
      courtFee,
      legalAid,
      inflationAmount,
      enforcementAmount,
      total,
    };
  }, [calculator, debtAmount, hasPublishedDebtors]);

  if (!calculator || !calculator.enabled || !hasPublishedDebtors) {
    return null;
  }

  return (
    <section className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-sm)] sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-[var(--pub-text)]">
          {calculator.title}
        </h2>

        <p className="mt-3 text-sm leading-7 text-[var(--pub-text-muted)]">
          {calculator.note}
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[var(--pub-text-muted)]">
            Введіть суму основної заборгованості
          </label>

          <input
            type="text"
            inputMode="decimal"
            value={debtAmount}
            onChange={(event) =>
              setDebtAmount(event.target.value.replace(/[^\d.,]/g, ""))
            }
            placeholder="Наприклад: 5000"
            className="mt-2 h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 text-[15px] text-[var(--pub-text)] outline-none transition-shadow placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className={INFO_TILE}>
            Судовий збір: {formatCurrency(parseNumber(calculator.courtFee))} ₴
          </div>
          <div className={INFO_TILE}>
            Правнича допомога: {formatCurrency(parseNumber(calculator.legalAid))} ₴
          </div>
          <div className={INFO_TILE}>
            Інфляційні / 3% річних: {calculator.inflationRate}%
          </div>
          <div className={INFO_TILE}>
            Виконавчий збір: {calculator.enforcementRate}%
          </div>
        </div>

        {debtAmount.trim() && result ? (
          <div className="mt-8 rounded-[var(--r-2xl)] border border-[var(--pub-accent-border)] bg-[var(--pub-accent-soft)] p-6">
            <div className="space-y-3 text-sm text-[var(--pub-text-muted)]">
              <div>Основний борг: {formatCurrency(result.baseDebt)} ₴</div>
              <div>Інфляційні / 3%: {formatCurrency(result.inflationAmount)} ₴</div>
              <div>Виконавчий збір: {formatCurrency(result.enforcementAmount)} ₴</div>
            </div>

            <div className="mt-5 border-t border-[var(--pub-accent-border)] pt-5">
              <div className="text-sm text-[var(--pub-text-muted)]">
                Орієнтовна загальна сума до сплати
              </div>
              <div className="mt-2 font-[var(--font-serif)] text-3xl font-semibold text-[var(--pub-accent-strong)]">
                {formatCurrency(result.total)} ₴
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
            Введіть суму боргу, щоб побачити орієнтовний розрахунок.
          </div>
        )}

        <p className="mt-6 text-xs leading-6 text-[var(--pub-text-soft)]">
          {calculator.disclaimer}
        </p>
      </div>
    </section>
  );
}
