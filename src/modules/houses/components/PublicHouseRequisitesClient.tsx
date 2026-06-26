"use client";
import { houseRequisitesCopy } from "@/src/shared/publicCopy/house";

import { useState } from "react";
import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

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
    <div className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 text-[var(--pub-text)] shadow-[var(--pub-shadow-sm)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
        {label}
      </div>

      <div className="mt-3 break-all text-base font-semibold tracking-wide text-[var(--pub-text)] sm:text-lg">
        {value || houseRequisitesCopy.card.empty}
      </div>

      {helper ? (
        <div className="mt-2 text-sm text-[var(--pub-text-muted)]">{helper}</div>
      ) : null}

      <PubButton
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        leftIcon={<PubIcon name="copy" className="h-4 w-4" />}
      >
        {value ? houseRequisitesCopy.card.copy : houseRequisitesCopy.card.noData}
      </PubButton>
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
    <div className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--pub-text-soft)]">
        {label}
      </div>

      {helper ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--pub-text-muted)]">{helper}</p>
      ) : null}

      <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-5 text-base leading-8 text-[var(--pub-text)] sm:text-[1.05rem]">
        {value || houseRequisitesCopy.card.empty}
      </div>

      <PubButton
        type="button"
        variant="secondary"
        size="sm"
        className="mt-5"
        onClick={() => onCopy(label, value)}
        disabled={!value}
        leftIcon={<PubIcon name="copy" className="h-4 w-4" />}
      >
        {value ? houseRequisitesCopy.card.copy : houseRequisitesCopy.card.noData}
      </PubButton>
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
      <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-[var(--pub-text-muted)]">
        {houseRequisitesCopy.page.empty}
        з’являться дані для ручної оплати та копіювання.
      </div>
    );
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2">
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

      <section className="grid gap-4 lg:grid-cols-2">
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

      <div className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-md)] sm:p-7">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--pub-text-soft)]">
          {houseRequisitesCopy.payment.title}
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--pub-text-muted)] sm:text-base">
          {houseRequisitesCopy.payment.description}, ви можете перейти за
          кнопкою нижче. Або використовуйте реквізити вище для ручного переказу.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {requisites.paymentUrl ? (
            <a
              href={requisites.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
            >
              <span className="break-words text-center">
                {requisites.paymentButtonLabel || houseRequisitesCopy.payment.buttonFallback}
              </span>
            </a>
          ) : (
            <div className="inline-flex min-h-[52px] items-center rounded-[var(--r-pill)] border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-5 text-sm text-[var(--pub-text-muted)]">
              {houseRequisitesCopy.payment.disabled}
            </div>
          )}
        </div>
      </div>

      {copiedLabel ? (
        <div className="fixed bottom-6 right-6 z-[80] inline-flex items-center gap-2 rounded-[var(--r-lg)] bg-[var(--pub-accent)] px-4 py-3 text-sm font-medium text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-lg)]">
          <PubIcon name="check" className="h-4 w-4" />
          {copiedLabel === houseRequisitesCopy.toast.error
            ? copiedLabel
            : `${houseRequisitesCopy.toast.copied}: ${copiedLabel}`}
        </div>
      ) : null}
    </>
  );
}
