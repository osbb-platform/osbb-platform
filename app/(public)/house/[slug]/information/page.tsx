import { houseInformationCopy } from "@/src/shared/publicCopy/house";
import { notFound } from "next/navigation";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { ensureHouseInformationPage } from "@/src/modules/houses/services/ensureHouseInformationPage";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";
import { getPublicHouseInformationDocuments } from "@/src/modules/houses/services/getPublicHouseInformationDocuments";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PublicInformationSlider } from "@/src/modules/houses/components/PublicInformationSlider";
import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    year?: string;
  }>;
};

const DOCUMENT_YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => String(2026 - index));

function getSortTimestamp(content: Record<string, unknown>) {
  const candidates = [content.publishedAt, content.updatedAt, content.createdAt];

  for (const value of candidates) {
    if (typeof value === "string" && value) {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) {
        return time;
      }
    }
  }

  return 0;
}

function formatPublishedAt(value: unknown) {
  if (typeof value !== "string" || !value) {
    return houseInformationCopy.date.recent;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return houseInformationCopy.date.recent;
  }

  return date.toLocaleDateString(houseInformationCopy.date.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

  const districtColor = house.district?.theme_color ?? "#22c55e";

  const informationPage = await ensureHouseInformationPage({
    houseId: house.id,
  });

  const sections = await getPublishedHouseSections(informationPage.id);
  const documents = await getPublicHouseInformationDocuments(house.id);

  const articles = sections
    .filter((section) => section.kind === "rich_text")
    .sort((a, b) => {
      const aContent =
        typeof a.content === "object" && a.content
          ? (a.content as Record<string, unknown>)
          : {};
      const bContent =
        typeof b.content === "object" && b.content
          ? (b.content as Record<string, unknown>)
          : {};

      const pinnedDiff =
        Number(Boolean(bContent.isPinned)) -
        Number(Boolean(aContent.isPinned));

      if (pinnedDiff !== 0) {
        return pinnedDiff;
      }

      return getSortTimestamp(bContent) - getSortTimestamp(aContent);
    });

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

  const faqSection = sections.find((section) => section.kind === "faq");
  const faqItems =
    faqSection &&
    typeof faqSection.content === "object" &&
    faqSection.content &&
    Array.isArray((faqSection.content as Record<string, unknown>).items)
      ? ((faqSection.content as Record<string, unknown>).items as Array<Record<string, unknown>>)
      : [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
        <div className="text-center">
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1F2A37] sm:mt-4 sm:text-6xl">
            {houseInformationCopy.page.title}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5B6B7C] sm:mt-5 sm:text-base sm:leading-8">
            {houseInformationCopy.page.description}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] p-3 shadow-[0_6px_20px_rgba(31,42,55,0.05)] sm:p-5">
          {articles.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)] sm:rounded-[32px] sm:p-6">
              {houseInformationCopy.empty.noMaterials}
            </div>
          ) : (
            <PublicInformationSlider
              articles={articles}
            />
          )}
        </div>
      </section>

      {documents.length > 0 ? (
        <section className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
            {houseInformationCopy.documents.subtitle}
          </h2>

          {documentYearsWithContent.length > 0 ? (
            <div className="mt-6 rounded-[28px] border border-[#DDD4CA] bg-[#F3EEE8] p-3 shadow-sm backdrop-blur-sm">
              <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
              {documentYearsWithContent.map((year) => {
                const isActive = selectedDocumentYear === year;
                const count = documents.filter((document) => String(document.document_year ?? "") === year).length;

                return (
                  <Link
                    key={year}
                    href={`/house/${slug}/information?year=${year}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                        : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                    }`}
                    style={
                      isActive
                        ? {
                            "--tab-active-bg": `${districtColor}20`,
                            "--tab-active-text": "#1F2A37",
                            borderColor: districtColor,
                          } as React.CSSProperties
                        : undefined
                    }
                  >
                    <span>{year}</span>
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive
                          ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]"
                          : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#D8CEC2] bg-[#F9F6F2] p-4 text-sm text-[#5F5A54] shadow-sm sm:rounded-[32px] sm:p-6">
              Для матеріалів ще не вказано роки. Оновіть матеріали в CMS та виберіть рік для відображення.
            </div>
          )}

          {filteredDocuments.length > 0 ? (
            <div className="mt-6 max-h-[840px] overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-3xl border border-[#E4DBD1] bg-[#F3EEE8] p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {document.document_year ? (
                        <span className="rounded-full border border-[#D8CEC2] bg-[#F6F2EC] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B6B7C]">
                          {document.document_year}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-base font-semibold text-slate-900">
                      {document.title}
                    </div>

                    <div className="mt-2 text-sm leading-6 text-[#5B6B7C]">
                      {document.description || houseInformationCopy.documents.pdfFallback}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      {formatPublishedAt(document.updated_at || document.created_at)}
                    </div>

                    <PublicReportPdfViewer
                      filePath={document.storage_path || ""}
                      fileName={document.original_file_name || document.title}
                      bucket="house-documents"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#D8CEC2] bg-[#F9F6F2] p-4 text-sm text-[#5F5A54] shadow-sm sm:rounded-[32px] sm:p-6">
              Матеріали за {selectedDocumentYear} рік поки не додані.
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-4 shadow-sm sm:rounded-[32px] sm:p-6">
        <h2 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
          {houseInformationCopy.faq.title}
        </h2>

        <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group rounded-2xl border border-[#E4DBD1] bg-[#F9F6F2] px-5 py-4 transition-all duration-200 hover:border-[#D8CEC2] hover:bg-[#F5F1EB]"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-[#1F2A37]">
                {String(item.question ?? houseInformationCopy.faq.questionFallback)}
              </summary>
              <div className="mt-4 rounded-xl border border-[#E4DBD1] bg-[#F3EEE8] px-4 py-3 text-sm leading-7 text-[#42546A]">
                {String(item.answer ?? "")}
              </div>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
