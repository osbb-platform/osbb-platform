"use client";
import { houseRequisitesCopy } from "@/src/shared/publicCopy/house";

import { useState } from "react";

type Requisites = {
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purposeTemplate: string;
  examplePurpose: string;
  paymentUrl: string;
  paymentButtonLabel: string;
  hasPublishedSnapshot: boolean;
};

type Props = {
  requisites: Requisites;
};

type RequisiteCardProps = {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
  isPrimary?: boolean;
  helper?: string;
};

function RequisiteCard({
  label,
  value,
  onCopy,
  isPrimary = false,
  helper,
}: RequisiteCardProps) {
  return (
    <div
      className={`rounded-[20px] border p-4 sm:rounded-[24px] sm:p-5 shadow-sm ${
        isPrimary
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-[var(--border)] bg-white text-slate-900"
      }`}
    >
      <div
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
          isPrimary ? "text-slate-300" : "text-[var(--muted)]"
        }`}
      >
        {label}
      </div>

      <div className="mt-3 break-all text-base font-semibold sm:text-lg">
        {value || houseRequisitesCopy.card.empty}
      </div>

      {helper ? (
        <div
          className={`mt-2 text-sm ${
            isPrimary ? "text-slate-300" : "text-[var(--muted)]"
          }`}
        >
          {helper}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        className={`mt-4 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isPrimary
            ? "border border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
        }`}
      >
        {value ? houseRequisitesCopy.card.copy : houseRequisitesCopy.card.noData}
      </button>
    </div>
  );
}

type TextBlockProps = {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
  helper?: string;
};

function TextBlock({ label, value, onCopy, helper }: TextBlockProps) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>

      {helper ? (
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{helper}</p>
      ) : null}

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-900 sm:text-base">
        {value || houseRequisitesCopy.card.empty}
      </div>

      <button
        type="button"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {value ? houseRequisitesCopy.card.copy : houseRequisitesCopy.card.noData}
      </button>
    </div>
  );
}

export function PublicHouseRequisitesClient({ requisites }: Props) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  async function handleCopy(label: string, value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);

      window.setTimeout(() => {
        setCopiedLabel(null);
      }, 1800);
    } catch {
      setCopiedLabel(houseRequisitesCopy.toast.error);
      window.setTimeout(() => {
        setCopiedLabel(null);
      }, 1800);
    }
  }

  if (!requisites.hasPublishedSnapshot) {
    return (
      <div className="mt-8 rounded-[28px] border border-dashed border-[var(--border)] bg-white p-6 text-[var(--muted)]">
        {houseRequisitesCopy.page.empty}
        появятся данные для ручной оплаты и копирования.
      </div>
    );
  }

  return (
    <>
      <section className="mt-6 grid gap-3 md:grid-cols-2 sm:mt-8 sm:gap-4">
        <RequisiteCard
          label={houseRequisitesCopy.card.recipient}
          value={requisites.recipient}
          helper={houseRequisitesCopy.card.helperRecipient}
          onCopy={handleCopy}
        />

        <RequisiteCard
          label={houseRequisitesCopy.card.iban}
          value={requisites.iban}
          helper={houseRequisitesCopy.card.helperIban}
          onCopy={handleCopy}
          isPrimary
        />

        <RequisiteCard
          label={houseRequisitesCopy.card.edrpou}
          value={requisites.edrpou}
          helper={houseRequisitesCopy.card.helperEdrpou}
          onCopy={handleCopy}
        />

        <RequisiteCard
          label={houseRequisitesCopy.card.bank}
          value={requisites.bank}
          helper={houseRequisitesCopy.card.helperBank}
          onCopy={handleCopy}
        />
      </section>

      <section className="mt-6 grid gap-3 lg:grid-cols-2 sm:mt-8 sm:gap-4">
        <TextBlock
          label={houseRequisitesCopy.blocks.purpose}
          value={requisites.purposeTemplate}
          helper={houseRequisitesCopy.blocks.helperPurpose}
          onCopy={handleCopy}
        />

        <TextBlock
          label={houseRequisitesCopy.blocks.example}
          value={requisites.examplePurpose}
          helper={houseRequisitesCopy.blocks.helperExample}
          onCopy={handleCopy}
        />
      </section>

      <div className="mt-6 rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-sm sm:mt-8 sm:rounded-[28px] sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {houseRequisitesCopy.payment.title}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          {houseRequisitesCopy.payment.description}, вы можете перейти по
          кнопке ниже. Иначе используйте реквизиты выше для ручного перевода.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {requisites.paymentUrl ? (
            <a
              href={requisites.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <span className="break-words text-center">
                {requisites.paymentButtonLabel || houseRequisitesCopy.payment.buttonFallback}
              </span>
            </a>
          ) : (
            <div className="inline-flex rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-500">
              {houseRequisitesCopy.payment.disabled}
            </div>
          )}
        </div>
      </div>

      {copiedLabel ? (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {copiedLabel === houseRequisitesCopy.toast.error
            ? copiedLabel
            : `${houseRequisitesCopy.toast.copied}: ${copiedLabel}`}
        </div>
      ) : null}
    </>
  );
}
