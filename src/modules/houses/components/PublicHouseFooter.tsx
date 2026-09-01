"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import {
  createFooterHouseMessage,
  type CreateFooterHouseMessageState,
} from "@/src/modules/houses/actions/createFooterHouseMessage";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type FooterSubject = "contact" | "improvement";

type ApartmentOption = {
  id: string;
  label: string;
  ownerName: string;
};

type PublicHouseFooterCompany = {
  name: string;
  slogan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  work_schedule: string | null;
};

type PublicHouseFooterProps = {
  districtColor: string;
  houseId: string;
  houseSlug: string;
  houseName: string;
  apartmentOptions: ApartmentOption[];
  managementCompany: PublicHouseFooterCompany | null;
};

const initialState: CreateFooterHouseMessageState = {
  error: null,
  successMessage: null,
};

const FIELD_CLASS =
  "h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 text-[15px] text-[var(--pub-text)] outline-none transition-shadow duration-150 placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]";

function FooterMessageForm({
  districtColor,
  houseId,
  houseSlug,
  houseName,
  subject,
  apartmentOptions,
}: {
  districtColor: string;
  houseId: string;
  houseSlug: string;
  houseName: string;
  subject: FooterSubject;
  apartmentOptions: ApartmentOption[];
}) {
  void districtColor;
  const [state, formAction, isPending] = useActionState(
    createFooterHouseMessage,
    initialState,
  );

  return state.successMessage ? (
    <div className="mt-6 rounded-[var(--r-lg)] border border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] p-6">
      <div className="text-lg font-semibold text-[var(--pub-text)]">
        {houseCopy.footer.successTitle}
      </div>
      <div className="mt-2 text-sm leading-7 text-[var(--pub-text-muted)]">
        {houseCopy.footer.successText}
      </div>
    </div>
  ) : (
    <form className="mt-6 grid gap-4" action={formAction}>
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />
      <input type="hidden" name="houseName" value={houseName} />
      <div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--pub-text-muted)]">
            {houseCopy.footer.subject}
          </span>
          <div className="relative">
            <select
              name="subjectType"
              defaultValue={
                subject === "improvement" ? "improvement" : "footer_contact"
              }
              className={`${FIELD_CLASS} cursor-pointer appearance-none pr-11`}
            >
              <option value="footer_contact">
                {houseCopy.footer.subjectManagementCompany}
              </option>
              <option value="improvement">
                {houseCopy.footer.subjectImprovement}
              </option>
              <option value="other">{houseCopy.footer.subjectOther}</option>
            </select>
            <PubIcon
              name="chevron-down"
              className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--pub-text-soft)]"
            />
          </div>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="text"
          name="requesterName"
          required
          className={FIELD_CLASS}
          placeholder={houseCopy.footer.namePlaceholder}
        />

        <input
          type="email"
          name="requesterEmail"
          required
          className={FIELD_CLASS}
          placeholder="E-mail"
        />
      </div>

      <div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--pub-text-muted)]">
            {houseCopy.footer.apartment}
          </span>
          <div className="relative">
            <select
              name="apartment"
              required
              defaultValue=""
              className={`${FIELD_CLASS} cursor-pointer appearance-none pr-11`}
            >
              <option value="" disabled>
                {houseCopy.footer.selectApartment}
              </option>
              {apartmentOptions.map((option) => (
                <option key={option.id} value={option.label}>
                  {option.ownerName
                    ? `${houseCopy.footer.apartmentShort} ${option.label} — ${option.ownerName}`
                    : `${houseCopy.footer.apartmentShort} ${option.label}`}
                </option>
              ))}
            </select>
            <PubIcon
              name="chevron-down"
              className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--pub-text-soft)]"
            />
          </div>
        </label>
      </div>

      <textarea
        rows={5}
        name="comment"
        required
        className="w-full resize-y rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 py-3.5 text-[15px] leading-relaxed text-[var(--pub-text)] outline-none transition-shadow duration-150 placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)] focus:shadow-[0_0_0_3px_var(--pub-accent-soft)]"
        placeholder={
          subject === "improvement"
            ? houseCopy.footer.improvementPlaceholder
            : houseCopy.footer.messagePlaceholder
        }
      />

      {state.error ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm text-[var(--pub-danger-text)]">
          {state.error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? houseCopy.footer.sendPending : houseCopy.footer.send}
        </button>
      </div>
    </form>
  );
}

export function PublicHouseFooter({
  districtColor,
  houseId,
  houseSlug,
  houseName,
  apartmentOptions,
  managementCompany,
}: PublicHouseFooterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState<FooterSubject>("contact");
  const [dialogKey, setDialogKey] = useState(0);

  function cleanCompanyField(value: string | null | undefined) {
    const normalized = value?.trim() ?? "";

    if (
      !normalized ||
      /^\{company(?:Slogan|Name|Phone|Email|Address)\}$/.test(normalized)
    ) {
      return null;
    }

    return normalized;
  }

  const companyName = cleanCompanyField(managementCompany?.name);
  const companySlogan = cleanCompanyField(managementCompany?.slogan);
  const companyPhone = cleanCompanyField(managementCompany?.phone);
  const companyEmail = cleanCompanyField(managementCompany?.email);
  const companyAddress = cleanCompanyField(managementCompany?.address);
  const companyWorkSchedule =
    managementCompany?.work_schedule?.trim() || houseCopy.footer.scheduleValue;

  const modalTitle = useMemo(() => houseCopy.footer.modalTitle, []);
  const modalDescription = useMemo(() => {
    if (subject === "improvement") {
      return houseCopy.footer.modalDescriptionImprovement;
    }

    return houseCopy.footer.modalDescriptionDefault;
  }, [subject]);

  function openModal(initialSubject: FooterSubject = "contact") {
    setSubject(initialSubject);
    setDialogKey((prev) => prev + 1);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  return (
    <>
      <footer className="border-t border-[var(--pub-border)] bg-[var(--pub-bg-quiet)]">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid items-center gap-6 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-md)] sm:p-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="flex items-center gap-5">
                <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[var(--r-lg)] bg-[var(--pub-accent-soft)] ring-1 ring-[var(--pub-accent-border)]">
                  <Image
                    src="/uk-logo.png"
                    alt={houseCopy.footer.companyLogoAlt}
                    fill
                    className="object-contain p-2.5"
                    sizes="64px"
                    priority={false}
                  />
                </div>

                <div className="min-w-0">
                  {companyName ? (
                    <div className="font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)]">
                      {companyName}
                    </div>
                  ) : null}
                  {companySlogan ? (
                    <div className="mt-1 text-base text-[var(--pub-text-muted)]">
                      {companySlogan}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {companyPhone ? (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                      Телефон
                    </div>
                    <div className="mt-1.5 text-[15px] font-medium text-[var(--pub-text)]">
                      {companyPhone}
                    </div>
                  </div>
                ) : null}

                {companyEmail ? (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                      E-mail
                    </div>
                    <div className="mt-1.5 break-all text-[15px] font-medium text-[var(--pub-text)]">
                      {companyEmail}
                    </div>
                  </div>
                ) : null}

                {companyAddress ? (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                      Адреса
                    </div>
                    <div className="mt-1.5 text-[15px] font-medium leading-7 text-[var(--pub-text)]">
                      {companyAddress}
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                    {houseCopy.footer.schedule}
                  </div>
                  <div className="mt-1.5 text-[15px] font-medium leading-7 text-[var(--pub-text)]">
                    {companyWorkSchedule}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-6 text-center">
              <div className="text-[15px] font-semibold text-[var(--pub-text)]">
                {houseCopy.footer.modalTitle}
              </div>
              <div className="mt-1.5 text-sm leading-6 text-[var(--pub-text-muted)]">
                {houseCopy.footer.modalDescriptionDefault}
              </div>
              <button
                type="button"
                onClick={() => openModal("contact")}
                className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-base font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
              >
                {houseCopy.footer.writeUs}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {isModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-[var(--pub-overlay)] backdrop-blur-[2px] transition"
            onClick={closeModal}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="w-full max-w-2xl rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-lg)] sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
                    {houseCopy.footer.modalEyebrow}
                  </div>
                  <h3 className="mt-2 font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-[28px]">
                    {modalTitle}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--pub-text-muted)]">
                    {modalDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Закрити"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] transition hover:bg-[var(--pub-bg-quiet)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]"
                >
                  <PubIcon name="close" className="h-5 w-5" />
                </button>
              </div>

              <FooterMessageForm
                key={`${dialogKey}-${subject}`}
                districtColor={districtColor}
                houseId={houseId}
                houseSlug={houseSlug}
                houseName={houseName}
                subject={subject}
                apartmentOptions={apartmentOptions}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
