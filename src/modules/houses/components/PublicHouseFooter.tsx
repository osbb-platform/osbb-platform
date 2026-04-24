"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useActionState, useMemo, useState } from "react";
import {
  createFooterHouseMessage,
  type CreateFooterHouseMessageState,
} from "@/src/modules/houses/actions/createFooterHouseMessage";

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
  const [state, formAction, isPending] = useActionState(
    createFooterHouseMessage,
    initialState,
  );

  return state.successMessage ? (
    <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
      <div className="text-lg font-semibold text-slate-950">
        {houseCopy.footer.successTitle}
      </div>
      <div className="mt-2 text-sm leading-7 text-slate-600">
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
          <span className="mb-2 block text-sm font-medium text-slate-900">
            {houseCopy.footer.subject}
          </span>
          <select
            name="subjectType"
            defaultValue={
              subject === "improvement"
                ? "improvement"
                : "footer_contact"
            }
            className="min-h-[54px] w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
          >
            <option value="footer_contact">
              {houseCopy.footer.subjectManagementCompany}
            </option>
            <option value="improvement">
              {houseCopy.footer.subjectImprovement}
            </option>
            <option value="other">{houseCopy.footer.subjectOther}</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="text"
          name="requesterName"
          required
          className="min-h-[54px] rounded-[20px] border border-slate-200 bg-slate-50 px-4 text-sm"
          placeholder={houseCopy.footer.namePlaceholder}
        />

        <input
          type="email"
          name="requesterEmail"
          required
          className="min-h-[54px] rounded-[20px] border border-slate-200 bg-slate-50 px-4 text-sm"
          placeholder="E-mail"
        />
      </div>

      <div>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-900">
            {houseCopy.footer.apartment}
          </span>
          <select
            name="apartment"
            required
            defaultValue=""
            className="min-h-[54px] w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
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
        </label>
      </div>

      <textarea
        rows={5}
        name="comment"
        required
        className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm"
        placeholder={
          subject === "improvement"
            ? houseCopy.footer.improvementPlaceholder
            : houseCopy.footer.messagePlaceholder
        }
      />

      {state.error ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] items-center justify-center rounded-[20px] px-5 text-sm font-semibold text-white"
          style={{ backgroundColor: districtColor } as CSSProperties}
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

  const companyName = managementCompany?.name?.trim() || "{companyName}";
  const companySlogan =
    managementCompany?.slogan?.trim() || "{companySlogan}";
  const companyPhone =
    managementCompany?.phone?.trim() || "{companyPhone}";
  const companyEmail =
    managementCompany?.email?.trim() || "{companyEmail}";
  const companyAddress =
    managementCompany?.address?.trim() ||
    "{companyAddress}";
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
      <footer
        className="border-t border-white/10"
        style={{
          background: `linear-gradient(180deg, ${districtColor} 0%, ${districtColor}DD 100%)`,
        }}
      >
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-10 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
            <div className="min-w-0">
              <div className="flex items-start gap-5">
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[24px] bg-white/90 shadow-sm ring-1 ring-white/20 backdrop-blur">
                  <Image
                    src="/uk-logo.png"
                    alt={houseCopy.footer.companyLogoAlt}
                    fill
                    className="object-contain p-3"
                    sizes="72px"
                    priority={false}
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-2xl font-semibold tracking-tight text-white">
                    {companyName}
                  </div>
                  <div className="mt-1 text-base text-white/90">
                    {companySlogan}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openModal("contact")}
                className="mt-6 inline-flex min-h-[58px] w-full items-center justify-center rounded-[22px] border border-white/30 px-6 text-base font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_36px_rgba(15,23,42,0.28)]"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
                  backdropFilter: "blur(6px)",
                  boxShadow:
                    "0 10px 30px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                {houseCopy.footer.writeUs}
              </button>
            </div>

            <div className="grid gap-6 text-white sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  Телефон
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {companyPhone}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  E-mail
                </div>
                <div className="mt-2 break-all text-base text-white">
                  {companyEmail}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  Адрес
                </div>
                <div className="mt-2 text-lg leading-8 text-white">
                  {companyAddress}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  {houseCopy.footer.schedule}
                </div>
                <div className="mt-2 text-lg leading-8 text-white">
                  {companyWorkSchedule}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {isModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/30 transition"
            onClick={closeModal}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {houseCopy.footer.modalEyebrow}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {modalTitle}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                    {modalDescription}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  ✕
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
