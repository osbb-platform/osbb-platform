import { houseInformationCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { ensureHouseInformationPage } from "@/src/modules/houses/services/ensureHouseInformationPage";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";
import { getPublicHouseInformationDocuments } from "@/src/modules/houses/services/getPublicHouseInformationDocuments";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PublicInformationSlider } from "@/src/modules/houses/components/PublicInformationSlider";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    category?: string;
  }>;
};

const CMS_CATEGORIES = [
  "О доме",
  "Правила проживания",
  "Полезная информация",
  "Контакты служб",
  "Инструкции для жильцов",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  "О доме": "Про будинок",
  "Правила проживания": "Правила проживання",
  "Полезная информация": "Корисна інформація",
  "Контакты служб": "Контакти служб",
  "Инструкции для жильцов": "Інструкції для мешканців",
};

function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

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

  const categoriesWithContent = CMS_CATEGORIES.filter((category) =>
    articles.some((section) => {
      const content =
        typeof section.content === "object" && section.content
          ? (section.content as Record<string, unknown>)
          : {};

      return content.category === category;
    }),
  );

  const categories: string[] = [houseInformationCopy.filters.all, ...categoriesWithContent];
  const requestedCategory = resolvedSearchParams.category ?? houseInformationCopy.filters.all;
  const activeCategory = categories.includes(requestedCategory)
    ? requestedCategory
    : houseInformationCopy.filters.all;

  const visibleArticles = articles.filter((section) => {
    if (activeCategory === houseInformationCopy.filters.all) {
      return true;
    }

    const content =
      typeof section.content === "object" && section.content
        ? (section.content as Record<string, unknown>)
        : {};

    return content.category === activeCategory;
  });

  const categoryCounts = Object.fromEntries(
    categories.map((category) => [
      category,
      category === houseInformationCopy.filters.all
        ? articles.length
        : articles.filter((section) => {
            const content =
              typeof section.content === "object" && section.content
                ? (section.content as Record<string, unknown>)
                : {};

            return content.category === category;
          }).length,
    ]),
  ) as Record<string, number>;

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
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
        <div className="text-center">
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:mt-4 sm:text-6xl">
            {houseInformationCopy.page.title}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:mt-5 sm:text-base sm:leading-8">
            {houseInformationCopy.page.description}
          </p>
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
            {categories.map((category) => {
              const isActive = activeCategory === category;
              const count = categoryCounts[category] ?? 0;

              return (
                <Link
                  key={category}
                  href={`/house/${slug}/information?category=${encodeURIComponent(category)}`}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                    isActive
                      ? "text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  style={isActive ? { backgroundColor: districtColor } : undefined}
                >
                  <span>{getCategoryLabel(category)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <section className="mt-8">
        {visibleArticles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)] sm:rounded-[32px] sm:p-6">
            {houseInformationCopy.empty.noMaterials}
          </div>
        ) : (
          <PublicInformationSlider
            articles={visibleArticles}
          />
        )}
      </section>

      {documents.length > 0 ? (
        <section className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-[32px] sm:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            {houseInformationCopy.documents.title}
          </div>

          <h2 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
            {houseInformationCopy.documents.subtitle}
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="text-base font-semibold text-slate-900">
                  {document.title}
                </div>

                <div className="mt-2 text-sm leading-6 text-slate-600">
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
        </section>
      ) : null}

      <section className="mt-8 rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:rounded-[32px] sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          FAQ
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">
          {houseInformationCopy.faq.title}
        </h2>

        <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4"
            >
              <summary className="cursor-pointer list-none text-base font-medium">
                {String(item.question ?? houseInformationCopy.faq.questionFallback)}
              </summary>
              <div className="mt-4 text-sm leading-7 text-slate-700">
                {String(item.answer ?? "")}
              </div>
            </details>
          ))}
        </div>
      </section>
    </section>
  );
}
