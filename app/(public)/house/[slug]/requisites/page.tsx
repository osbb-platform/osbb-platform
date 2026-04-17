import { houseRequisitesCopy } from "@/src/shared/publicCopy/house";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicHouseRequisitesClient } from "@/src/modules/houses/components/PublicHouseRequisitesClient";

type Props = {
  params: Promise<{ slug: string }>;
};

type RequisitesSnapshot = {
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purposeTemplate: string;
  paymentUrl: string;
  paymentButtonLabel: string;
};

function normalizeSnapshot(value: unknown): RequisitesSnapshot {
  if (!value || typeof value !== "object") {
    return {
      recipient: "",
      iban: "",
      edrpou: "",
      bank: "",
      purposeTemplate:
        "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}",
      paymentUrl: "",
      paymentButtonLabel: houseRequisitesCopy.payment.buttonFallback,
    };
  }

  const raw = value as Record<string, unknown>;

  return {
    recipient: String(raw.recipient ?? "").trim(),
    iban: String(raw.iban ?? "").trim(),
    edrpou: String(raw.edrpou ?? "").trim(),
    bank: String(raw.bank ?? "").trim(),
    purposeTemplate:
      String(
        raw.purposeTemplate ??
          "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}",
      ).trim() ||
      "Оплата взносов за квартиру {{apartment}}, лицевой счет {{account}}, за {{period}}",
    paymentUrl: String(raw.paymentUrl ?? "").trim(),
    paymentButtonLabel:
      String(raw.paymentButtonLabel ?? houseRequisitesCopy.payment.buttonFallback).trim() ||
      houseRequisitesCopy.payment.buttonFallback,
  };
}

function buildExamplePurpose(template: string) {
  return template
    .replaceAll("{{apartment}}", "12")
    .replaceAll("{{account}}", "1002")
    .replaceAll("{{period}}", "04.2026");
}

export default async function RequisitesPage({ params }: Props) {
  const { slug } = await params;

  const { sections } =
    await getPublishedHomeSectionsBySlug(slug);
  const requisitesSection = sections.find((section) => section.kind === "requisites");

  const sectionContent =
    requisitesSection &&
    typeof requisitesSection.content === "object" &&
    requisitesSection.content
      ? (requisitesSection.content as Record<string, unknown>)
      : null;

  const liveSnapshot = normalizeSnapshot(
    sectionContent?.liveSnapshot ?? sectionContent,
  );
  const hasPublishedSnapshot = Boolean(
    liveSnapshot.recipient ||
      liveSnapshot.iban ||
      liveSnapshot.edrpou ||
      liveSnapshot.bank ||
      liveSnapshot.purposeTemplate,
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8"><div className="text-center">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {houseRequisitesCopy.page.title}
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
          {houseRequisitesCopy.page.description}
        </p>
      </div></div>

      <PublicHouseRequisitesClient
        requisites={{
          recipient: liveSnapshot.recipient,
          iban: liveSnapshot.iban,
          edrpou: liveSnapshot.edrpou,
          bank: liveSnapshot.bank,
          purposeTemplate: liveSnapshot.purposeTemplate,
          examplePurpose: buildExamplePurpose(liveSnapshot.purposeTemplate),
          paymentUrl: liveSnapshot.paymentUrl,
          paymentButtonLabel: liveSnapshot.paymentButtonLabel,
          hasPublishedSnapshot,
        }}
      />
    </section>
  );
}
