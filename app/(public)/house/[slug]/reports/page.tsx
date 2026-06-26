import { notFound } from "next/navigation";
import { houseReportsCopy } from "@/src/shared/publicCopy/house";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseReports } from "@/src/modules/houses/services/getPublishedHouseReports";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    mode?: string;
    month?: string;
    year?: string;
  }>;
};

const MONTH_LABELS: Record<string, string> = houseReportsCopy.months;

const MONTH_ORDER = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

const MONTH_INDEX = new Map(
  MONTH_ORDER.map((month, index) => [month, index]),
);

function getMonthLabel(value: string) {
  const numericMonthLabels: Record<string, string> = {
    "01": "Січень",
    "02": "Лютий",
    "03": "Березень",
    "04": "Квітень",
    "05": "Травень",
    "06": "Червень",
    "07": "Липень",
    "08": "Серпень",
    "09": "Вересень",
    "10": "Жовтень",
    "11": "Листопад",
    "12": "Грудень",
  };

  return numericMonthLabels[value] ?? MONTH_LABELS[value] ?? value;
}

function normalizeReportCategoryLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  const map: Record<string, string> = {
    "Выполненные работы": "Виконані роботи",
    "Финансовый отчет": "Фінансовий звіт",
    "Ремонт и обслуживание": "Ремонт та обслуговування",
    "Инженерные системы": "Інженерні системи",
  };

  return map[normalized] ?? normalized;
}

function isStillNew(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

export default async function ReportsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const { reports } = await getPublishedHouseReports(house.id);

  const visibleReports = reports.slice().sort((a, b) => {
    const aDate = new Date(a.reportDate ?? "").getTime() || 0;
    const bDate = new Date(b.reportDate ?? "").getTime() || 0;
    return bDate - aDate;
  });

  const currentYear = new Date().getFullYear();

  const currentReports = visibleReports.filter(
    (item) =>
      item.periodType === "current" &&
      new Date(item.reportDate ?? "").getFullYear() === currentYear,
  );

  const pastReports = visibleReports.filter((item) => item.periodType === "past");

  function sortReportsForGrid(items: typeof visibleReports) {
    return [...items].sort((left, right) => {
      const pinnedDiff =
        Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));

      if (pinnedDiff !== 0) {
        return pinnedDiff;
      }

      const leftDate = new Date(left.reportDate ?? "").getTime() || 0;
      const rightDate = new Date(right.reportDate ?? "").getTime() || 0;

      return rightDate - leftDate;
    });
  }

  const availableMonths = Array.from(
    new Set(
      currentReports
        .map((item) => item.month)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  ).sort((left, right) => {
    const leftIndex = MONTH_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = MONTH_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex;
  });

  const availableYears = Array.from(
    new Set(
      pastReports
        .map((item) => item.year)
        .filter((item): item is number => typeof item === "number"),
    ),
  ).sort((a, b) => b - a);

  const selectedMode =
    resolvedSearchParams.mode === "archive"
      ? "archive"
      : resolvedSearchParams.mode === "past"
        ? "past"
        : "current";

  const selectedMonth =
    resolvedSearchParams.month && availableMonths.includes(resolvedSearchParams.month)
      ? resolvedSearchParams.month
      : (availableMonths[0] ?? null);

  const selectedYear =
    resolvedSearchParams.year && availableYears.includes(Number(resolvedSearchParams.year))
      ? resolvedSearchParams.year
      : (availableYears[0] ? String(availableYears[0]) : null);

  const filteredReports =
    selectedMode === "archive" || selectedMode === "past"
      ? sortReportsForGrid(
          pastReports.filter((item) =>
            selectedYear ? String(item.year ?? "") === selectedYear : false,
          ),
        )
      : sortReportsForGrid(
          currentReports.filter((item) =>
            selectedMonth ? item.month === selectedMonth : false,
          ),
        );

  const modeTabs: PubFilterTabItem[] = [
    {
      key: "current",
      label: houseReportsCopy.tabs.current,
      href: `/reports?mode=current${availableMonths[0] ? `&month=${availableMonths[0]}` : ""}`,
      count: currentReports.length,
      active: selectedMode === "current",
    },
    {
      key: "past",
      label: "Минулі роки",
      href: `/reports?mode=past${availableYears[0] ? `&year=${availableYears[0]}` : ""}`,
      count: pastReports.length,
      active: selectedMode === "past" || selectedMode === "archive",
    },
  ];

  const periodTabs: PubFilterTabItem[] =
    selectedMode === "past" || selectedMode === "archive"
      ? availableYears.map((year) => ({
          key: String(year),
          label: String(year),
          href: `/reports?mode=past&year=${year}`,
          active: selectedYear === String(year),
        }))
      : availableMonths.map((month) => ({
          key: month,
          label: getMonthLabel(month),
          href: `/reports?mode=current&month=${month}`,
          active: selectedMonth === month,
        }));

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={houseReportsCopy.page.title}
        description={`${houseReportsCopy.page.title} про виконані роботи та ключові оновлення будинку в одному місці.`}
      >
        <div className="grid gap-4">
          <PubFilterTabs items={modeTabs} framed={false} ariaLabel="Період звітів" />
          {periodTabs.length > 0 ? <PubFilterTabs items={periodTabs} /> : null}
        </div>
      </PubSectionHeader>

      <section>
        {filteredReports.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
            {selectedMode === "past"
              ? "Звіти минулих років за обраний період поки відсутні."
              : selectedMode === "archive"
                ? "Архів звітів за обраний період поки порожній."
                : `${houseReportsCopy.page.title} поточного року поки не опубліковані.`}
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredReports.map((report) => (
              <article
                key={report.id}
                className="flex w-full min-w-0 flex-col rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] transition hover:shadow-[var(--pub-shadow-md)]"
              >
                <div className="flex flex-wrap gap-2">
                  <PubBadge tone="neutral" size="sm">
                    {normalizeReportCategoryLabel(report.categoryTitle)}
                  </PubBadge>

                  {report.isPinned ? (
                    <PubBadge tone="warning" size="sm">
                      Важливе
                    </PubBadge>
                  ) : null}

                  {report.isNew && isStillNew(report.newUntil) ? (
                    <PubBadge tone="success" size="sm">
                      Нове
                    </PubBadge>
                  ) : null}
                </div>

                <div className="mt-4 break-words text-base font-semibold text-[var(--pub-text)] sm:text-lg">
                  {report.title}
                </div>

                <p className="mt-3 break-words text-sm leading-7 text-[var(--pub-text-muted)]">
                  {report.description}
                </p>

                <PublicReportPdfViewer
                  filePath={report.pdf?.path ?? ""}
                  fileName={report.pdf?.originalName ?? undefined}
                  analyticsHouseId={house.id}
                  analyticsHouseSlug={house.slug}
                  analyticsEntityId={report.id}
                  analyticsDocumentType="report"
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
