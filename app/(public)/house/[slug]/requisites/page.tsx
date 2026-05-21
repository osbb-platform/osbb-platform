import { notFound } from "next/navigation";

import { PublicHouseRequisitesClient } from "@/src/modules/houses/components/PublicHouseRequisitesClient";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseRequisites } from "@/src/modules/houses/services/getPublishedHouseRequisites";
import { houseRequisitesCopy } from "@/src/shared/publicCopy/house";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

const DEFAULT_PURPOSE_TEMPLATE =
  "Оплата внесків за квартиру {{apartment}}, особовий рахунок {{account}}, за {{period}}";

function normalizeLegacyPurposeTemplate(value: string) {
  const normalized = value.trim();

  if (
    normalized ===
    "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}"
  ) {
    return DEFAULT_PURPOSE_TEMPLATE;
  }

  return normalized;
}

export default async function RequisitesPage({ params }: Props) {
  const { slug } = await params;

  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const requisites = await getPublishedHouseRequisites(house.id);

  const purposeTemplate =
    normalizeLegacyPurposeTemplate(
      requisites?.purposeTemplate ?? DEFAULT_PURPOSE_TEMPLATE,
    ) || DEFAULT_PURPOSE_TEMPLATE;

  const hasPublishedSnapshot = Boolean(
    requisites &&
      [
        requisites.recipient,
        requisites.iban,
        requisites.edrpou,
        requisites.bank,
        purposeTemplate,
      ].some((value) => value.trim().length > 0),
  );

  const examplePurpose = purposeTemplate
    .replaceAll("{{apartment}}", "12")
    .replaceAll("{{account}}", "000012")
    .replaceAll("{{period}}", "травень 2026");

  return (
    <div className="relative overflow-hidden">
      <section className="relative border-b border-[var(--color-public-border)] bg-[var(--color-public-hero-bg)] px-4 py-14 text-[var(--color-public-text)] md:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-public-text-muted)]">
            {house.name}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-public-text)] md:text-5xl">
            {houseRequisitesCopy.page.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-[var(--color-public-text-soft)] md:text-lg">
            {houseRequisitesCopy.page.description}
          </p>
        </div>
      </section>

      <PublicHouseRequisitesClient
        requisites={{
          hasPublishedSnapshot,
          recipient: requisites?.recipient ?? "",
          iban: requisites?.iban ?? "",
          edrpou: requisites?.edrpou ?? "",
          bank: requisites?.bank ?? "",
          purposeTemplate,
          examplePurpose,
          paymentUrl: requisites?.paymentUrl ?? "",
          paymentButtonLabel:
            requisites?.paymentButtonLabel ||
            houseRequisitesCopy.payment.buttonFallback,
        }}
      />
    </div>
  );
}
