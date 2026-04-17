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
    <section className="mt-8 rounded-[28px] border border-[var(--border)] bg-white p-6">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Оплата
      </div>

      <h2 className="mt-3 text-2xl font-semibold text-slate-900">
        {payment.title}
      </h2>

      {payment.note ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          {payment.note}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={accountQuery}
          onChange={(event) => setAccountQuery(event.target.value)}
          placeholder="Введіть повний особовий рахунок"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
        />
        <button
          type="button"
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          Перевірити
        </button>
      </div>

      {accountQuery.trim() ? (
        match ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-500">
              Квартира {match.apartmentLabel}
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              {formatCurrency(normalizeAmount(match.amount))} ₴
            </div>

            {payment.url ? (
              <a
                href={payment.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
              >
                {payment.buttonLabel}
              </a>
            ) : (
              <div className="mt-4 inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-500">
                Посилання на оплату ще не додано
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            За вказаним рахунком заборгованість не знайдена.
          </div>
        )
      ) : null}
    </section>
  );
}
