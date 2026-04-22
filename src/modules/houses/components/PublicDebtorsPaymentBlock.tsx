"use client";

import { useMemo, useState } from "react";

type DebtorItem = {
  apartmentId: string;
  apartmentLabel: string;
  accountNumber: string;
  amount: string;
};

type PaymentSettings = {
  url: string;
  title: string;
  note: string;
  buttonLabel: string;
};

type Props = {
  payment: PaymentSettings;
  items: DebtorItem[];
};

function normalizeAmount(value: string) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PublicDebtorsPaymentBlock({
  payment,
  items,
}: Props) {
  const [accountQuery, setAccountQuery] = useState("");

  const match = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    if (!query) return null;

    return (
      items.find((item) =>
        item.accountNumber.toLowerCase().includes(query),
      ) ?? null
    );
  }, [accountQuery, items]);

  return (
    <section className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#F3EEE8] p-6">
      <h2 className="mt-3 text-2xl font-semibold text-[#1F2A37]">
        {payment.title}
      </h2>

      {payment.note ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5B6B7C]">
          {payment.note}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={accountQuery}
          onChange={(event) => setAccountQuery(event.target.value)}
          placeholder="Введіть повний особовий рахунок"
          className="w-full rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] px-4 py-3 text-[#1F2A37] outline-none transition hover:border-[#CBBBAA] focus:border-[#CBBBAA] focus:ring-2 focus:ring-[#E5DBCF]"
        />
        <button
          type="button"
          className="rounded-2xl bg-[#DDD1C3] px-5 py-3 text-sm font-medium text-[#1F2A37] transition hover:bg-[#E5DBCF]"
        >
          Перевірити
        </button>
      </div>

      {accountQuery.trim() ? (
        match ? (
          <div className="mt-5 rounded-2xl border border-[#DDD4CA] bg-[#F6F2EC] p-4">
            <div className="text-sm text-[#7A746B]">
              Квартира {match.apartmentLabel}
            </div>
            <div className="mt-2 text-lg font-semibold text-[#1F2A37]">
              {formatCurrency(normalizeAmount(match.amount))} ₴
            </div>

            {payment.url ? (
              <a
                href={payment.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-2xl bg-[#DDD1C3] px-5 py-3 text-sm font-medium text-[#1F2A37] transition hover:bg-[#E5DBCF]"
              >
                {payment.buttonLabel}
              </a>
            ) : (
              <div className="mt-4 inline-flex rounded-2xl border border-[#DDD4CA] bg-[#ECE6DF] px-5 py-3 text-sm text-[#7A746B]">
                Посилання на оплату ще не додано
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[#DDD4CA] bg-[#F6F2EC] p-4 text-sm text-[#7A746B]">
            За вказаним рахунком заборгованість не знайдена.
          </div>
        )
      ) : null}
    </section>
  );
}
