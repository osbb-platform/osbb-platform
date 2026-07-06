import { houseInformationCopy } from "@/src/shared/publicCopy/house";
import { notFound } from "next/navigation";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublicHouseInformationDocuments } from "@/src/modules/houses/services/getPublicHouseInformationDocuments";
import { getPublishedHouseFaq } from "@/src/modules/houses/services/getPublishedHouseFaq";
import { getPublishedHouseInformationPosts } from "@/src/modules/houses/services/getPublishedHouseInformationPosts";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PublicInformationSlider } from "@/src/modules/houses/components/PublicInformationSlider";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    year?: string;
  }>;
};

export default async function InformationPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const [articles, documents, faq] = await Promise.all([
    getPublishedHouseInformationPosts(house.id),
    getPublicHouseInformationDocuments(house.id),
    getPublishedHouseFaq(house.id),
  ]);

  const documentYearsWithContent = Array.from(
    new Set(
      documents
        .map((item) => item.document_year)
        .filter((item): item is number => Number.isInteger(item)),
    ),
  )
    .sort((a, b) => b - a)
    .map(String);

  const selectedDocumentYear =
    resolvedSearchParams.year &&
    documentYearsWithContent.includes(resolvedSearchParams.year)
      ? resolvedSearchParams.year
      : (documentYearsWithContent[0] ?? null);

  const filteredDocuments = documents.filter((document) =>
    document.document_year ? String(document.document_year) === selectedDocumentYear : false,
  );

  const faqItems = faq?.items ?? [];

  const yearTabs: PubFilterTabItem[] = documentYearsWithContent.map((year) => ({
    key: year,
    label: year,
    href: `/information?year=${year}`,
    count: documents.filter(
      (document) => String(document.document_year ?? "") === year,
    ).length,
    active: selectedDocumentYear === year,
  }));

  return (
    <div className="grid min-w-0 gap-8">
      <PubSectionHeader
        title={houseInformationCopy.page.title}
        description={houseInformationCopy.page.description}
      />

      <section>
        <div className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 shadow-[var(--pub-shadow-sm)] sm:p-5">
          {articles.length === 0 ? (
            <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
              {houseInformationCopy.empty.noMaterials}
            </div>
          ) : (
            <PublicInformationSlider articles={articles} />
          )}
        </div>
      </section>

      {documents.length > 0 ? (
        <section className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
          <h2 className="font-[var(--font-serif)] text-xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-2xl">
            {houseInformationCopy.documents.subtitle}
          </h2>

          {documentYearsWithContent.length > 0 ? (
            <div className="mt-6">
              <PubFilterTabs items={yearTabs} ariaLabel="Рік документів" />
            </div>
          ) : (
            <div className="mt-6 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
              Для матеріалів ще не вказано роки. Оновіть матеріали в CMS та виберіть рік для відображення.
            </div>
          )}

          {filteredDocuments.length > 0 ? (
            <div className="mt-6 max-h-[840px] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-5 shadow-[var(--pub-shadow-sm)]"
                  >
                    {document.document_year ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <PubBadge tone="neutral" size="sm">
                          {document.document_year}
                        </PubBadge>
                      </div>
                    ) : null}

                    <div className="mt-3 text-base font-semibold text-[var(--pub-text)]">
                      {document.title}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-[var(--pub-text-muted)]">
                      {document.description || houseInformationCopy.documents.pdfFallback}
                    </div>

                    <PublicReportPdfViewer
                      entityType="house_document"
                      entityId={document.id}
                      fieldKey="pdf"
                      houseSlug={house.slug}
                      fileName={document.original_file_name || document.title}
                      analyticsHouseId={house.id}
                      analyticsHouseSlug={house.slug}
                      analyticsEntityId={document.id}
                      analyticsDocumentType="information_document"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
              Матеріали за {selectedDocumentYear} рік поки не додані.
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
        <h2 className="font-[var(--font-serif)] text-xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-2xl">
          {houseInformationCopy.faq.title}
        </h2>

        <div className="mt-4 space-y-3 sm:mt-6">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-5 py-4 transition hover:border-[var(--pub-border-strong)]"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-[var(--pub-text)]">
                {item.question || houseInformationCopy.faq.questionFallback}
              </summary>
              <div className="mt-4 rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-4 py-3 text-sm leading-7 text-[var(--pub-text-muted)]">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
