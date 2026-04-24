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
    <section className="mt-10 rounded-[28px] border border-[#DDD4CA] bg-[#F3EEE8] p-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-semibold text-[#1F2A37]">
          {calculator.title}
        </h2>

        <p className="mt-3 text-sm leading-7 text-[#6F685F]">
          {calculator.note}
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#2A3642]">
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
            className="mt-2 w-full rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition hover:border-[#CBBBAA] focus:border-[#CBBBAA] focus:ring-2 focus:ring-[#E5DBCF]"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] p-4">
            Судовий збір: {formatCurrency(parseNumber(calculator.courtFee))} ₴
          </div>
          <div className="rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] p-4">
            Правнича допомога: {formatCurrency(parseNumber(calculator.legalAid))} ₴
          </div>
          <div className="rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] p-4">
            Інфляційні / 3% річних: {calculator.inflationRate}%
          </div>
          <div className="rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] p-4">
            Виконавчий збір: {calculator.enforcementRate}%
          </div>
        </div>

        {debtAmount.trim() && result ? (
          <div className="mt-8 rounded-[24px] border border-[#D7C8B7] bg-[#EAE2D8] p-6">
            <div className="space-y-3 text-sm text-[#2A3642]">
              <div>Основний борг: {formatCurrency(result.baseDebt)} ₴</div>
              <div>Інфляційні / 3%: {formatCurrency(result.inflationAmount)} ₴</div>
              <div>Виконавчий збір: {formatCurrency(result.enforcementAmount)} ₴</div>
            </div>

            <div className="mt-5 border-t border-[#D7C8B7] pt-5">
              <div className="text-sm text-[#2A3642]">
                Орієнтовна загальна сума до сплати
              </div>
              <div className="mt-2 text-3xl font-semibold text-[#1F2A37]">
                {formatCurrency(result.total)} ₴
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-dashed border-[#D7C8B7] bg-[#F6F2EC] p-6 text-sm text-[#6F685F]">
            Введіть суму боргу, щоб побачити орієнтовний розрахунок.
          </div>
        )}

        <p className="mt-6 text-xs leading-6 text-[#7A746B]">
          {calculator.disclaimer}
        </p>
      </div>
    </section>
  );
}
