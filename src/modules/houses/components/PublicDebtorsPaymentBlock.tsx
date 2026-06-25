"use client";

import { useMemo, useState } from "react";
import { PubButton } from "@/src/shared/ui/public/PubButton";

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
    <section className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-sm)]">
      <h2 className="font-[var(--font-serif)] text-2xl font-semibold text-[var(--pub-text)]">
        {payment.title}
      </h2>

      {payment.note ? (
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--pub-text-muted)]">
          {payment.note}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={accountQuery}
          onChange={(event) => setAccountQuery(event.target.value)}
          placeholder="Введіть повний особовий рахунок"
          className="h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 text-[15px] text-[var(--pub-text)] outline-none transition-shadow placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]"
        />
        <PubButton type="button" variant="secondary">
          Перевірити
        </PubButton>
      </div>

      {accountQuery.trim() ? (
        match ? (
          <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4">
            <div className="text-sm text-[var(--pub-text-soft)]">
              Квартира {match.apartmentLabel}
            </div>
            <div className="mt-2 font-[var(--font-serif)] text-lg font-semibold text-[var(--pub-text)]">
              {formatCurrency(normalizeAmount(match.amount))} ₴
            </div>

            {payment.url ? (
              <a
                href={payment.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-[48px] items-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-5 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
              >
                {payment.buttonLabel}
              </a>
            ) : (
              <div className="mt-4 inline-flex min-h-[48px] items-center rounded-[var(--r-pill)] border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-5 text-sm text-[var(--pub-text-muted)]">
                Посилання на оплату ще не додано
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]">
            За вказаним рахунком заборгованість не знайдена.
          </div>
        )
      ) : null}
    </section>
  );
}
