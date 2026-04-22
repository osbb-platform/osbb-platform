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
  helper?: string;
};

function RequisiteCard({
  label,
  value,
  onCopy,
  helper,
}: RequisiteCardProps) {
  return (
    <div className="rounded-[20px] border border-[#E3D9CE] bg-[#F7F3EE] p-4 text-[var(--foreground)] shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {label}
      </div>

      <div className="mt-3 break-all text-base font-semibold tracking-wide sm:text-lg">
        {value || houseRequisitesCopy.card.empty}
      </div>

      {helper ? (
        <div className="mt-2 text-sm text-[var(--muted)]">
          {helper}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        className="mt-4 rounded-full border border-[#D2C6B8] bg-[#E7DED3] px-4 py-2 text-sm font-medium text-[#1F2A37] transition hover:bg-[#DDD1C3] disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="rounded-[24px] border border-[#DED3C6] bg-[#F3EEE8] p-5 shadow-sm sm:rounded-[30px] sm:p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A746B]">
        {label}
      </div>

      {helper ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">{helper}</p>
      ) : null}

      <div className="mt-5 rounded-[26px] border border-[#D8CCBE] bg-[#F8F3EC] p-5 text-base leading-8 text-[#1F2A37] sm:text-[1.05rem]">
        {value || houseRequisitesCopy.card.empty}
      </div>

      <button
        type="button"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        className="mt-5 inline-flex rounded-full border border-[#D2C6B8] bg-[#E7DED3] px-4 py-2 text-sm font-medium text-[#1F2A37] transition hover:bg-[#DDD1C3] disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="mt-8 rounded-[28px] border border-dashed border-[#DDD1C3] bg-[#F6F1EB] p-6 text-[var(--muted)]">
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

      <div className="mt-6 rounded-[26px] border border-[#D6C9B8] bg-[#E8DED1] p-5 shadow-[0_10px_28px_rgba(31,42,55,0.05)] sm:mt-8 sm:rounded-[32px] sm:p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#73685D]">
          {houseRequisitesCopy.payment.title}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5F5A54] sm:text-base">
          {houseRequisitesCopy.payment.description}, вы можете перейти по
          кнопке ниже. Иначе используйте реквизиты выше для ручного перевода.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {requisites.paymentUrl ? (
            <a
              href={requisites.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-[22px] border border-[#C7B9A8] bg-[#D8CABA] px-6 py-3 text-sm font-semibold text-[#1F2A37] transition hover:bg-[#CFBEAC]"
            >
              <span className="break-words text-center">
                {requisites.paymentButtonLabel || houseRequisitesCopy.payment.buttonFallback}
              </span>
            </a>
          ) : (
            <div className="inline-flex rounded-[22px] border border-[#D2C6B8] bg-[#EFE7DC] px-5 py-3 text-sm text-[#7A746B]">
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
