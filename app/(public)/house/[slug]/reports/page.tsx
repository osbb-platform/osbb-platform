import { notFound } from "next/navigation";
import { houseReportsCopy } from "@/src/shared/publicCopy/house";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseReports } from "@/src/modules/houses/services/getPublishedHouseReports";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";
import {
  filterHouseReportsByPeriod,
  getAvailableReportMonthPeriods,
  getAvailableReportQuarterPeriods,
  getAvailableReportYears,
  getHouseReportMonthLabel,
  getHouseReportPeriodLabel,
  getHouseReportQuarterLabel,
  resolveReportPeriodFilterMode,
  sortHouseReportSnapshots,
} from "@/src/modules/houses/utils/houseReportPeriodView";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    mode?: string;
    period?: string;
    month?: string;
    quarter?: string;
    year?: string;
  }>;
};

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

function getEmptyMessage(periodMode: "all" | "month" | "quarter" | "year") {
  if (periodMode === "month") {
    return "Місячні звіти за обраний період поки відсутні.";
  }

  if (periodMode === "quarter") {
    return "Квартальні звіти за обраний період поки відсутні.";
  }

  if (periodMode === "year") {
    return "Річні звіти за обраний період поки відсутні.";
  }

  return `${houseReportsCopy.page.title} поки не опубліковані.`;
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
  const sortedReports = sortHouseReportSnapshots(reports);
  const selectedPeriodMode = resolveReportPeriodFilterMode(resolvedSearchParams);

  const availableMonthPeriods = getAvailableReportMonthPeriods(sortedReports);
  const availableQuarterPeriods = getAvailableReportQuarterPeriods(sortedReports);
  const availableYears = getAvailableReportYears(sortedReports);

  const selectedMonthPeriod =
    availableMonthPeriods.find(
      (item) =>
        resolvedSearchParams.month === item.month &&
        Number(resolvedSearchParams.year) === item.year,
    ) ??
    availableMonthPeriods[0] ??
    null;

  const selectedQuarterPeriod =
    availableQuarterPeriods.find(
      (item) =>
        Number(resolvedSearchParams.quarter) === item.quarter &&
        Number(resolvedSearchParams.year) === item.year,
    ) ??
    availableQuarterPeriods[0] ??
    null;

  const selectedYear =
    availableYears.find((year) => Number(resolvedSearchParams.year) === year) ??
    availableYears[0] ??
    null;

  const filteredReports = filterHouseReportsByPeriod(sortedReports, {
    mode: selectedPeriodMode,
    monthPeriod: selectedMonthPeriod,
    quarterPeriod: selectedQuarterPeriod,
    year: selectedYear,
  });

  const monthReportsCount = sortedReports.filter(
    (item) => item.periodKind === "month" && item.periodMonth && item.periodYear,
  ).length;
  const quarterReportsCount = sortedReports.filter(
    (item) => item.periodKind === "quarter" && item.periodQuarter && item.periodYear,
  ).length;
  const yearReportsCount = sortedReports.filter(
    (item) => item.periodKind === "year" && item.periodYear,
  ).length;

  const periodModeTabs: PubFilterTabItem[] = [
    {
      key: "all",
      label: "Усі",
      href: "/reports?period=all",
      count: sortedReports.length,
      active: selectedPeriodMode === "all",
    },
    {
      key: "month",
      label: "Місяць",
      href: selectedMonthPeriod
        ? `/reports?period=month&year=${selectedMonthPeriod.year}&month=${selectedMonthPeriod.month}`
        : "/reports?period=month",
      count: monthReportsCount,
      active: selectedPeriodMode === "month",
    },
    {
      key: "quarter",
      label: "Квартал",
      href: selectedQuarterPeriod
        ? `/reports?period=quarter&year=${selectedQuarterPeriod.year}&quarter=${selectedQuarterPeriod.quarter}`
        : "/reports?period=quarter",
      count: quarterReportsCount,
      active: selectedPeriodMode === "quarter",
    },
    {
      key: "year",
      label: "Рік",
      href: selectedYear ? `/reports?period=year&year=${selectedYear}` : "/reports?period=year",
      count: yearReportsCount,
      active: selectedPeriodMode === "year",
    },
  ];

  const valueTabs: PubFilterTabItem[] =
    selectedPeriodMode === "month"
      ? availableMonthPeriods.map((period) => ({
          key: `${period.year}-${period.month}`,
          label: `${getHouseReportMonthLabel(period.month)} ${period.year}`,
          href: `/reports?period=month&year=${period.year}&month=${period.month}`,
          active:
            selectedMonthPeriod?.year === period.year &&
            selectedMonthPeriod.month === period.month,
        }))
      : selectedPeriodMode === "quarter"
        ? availableQuarterPeriods.map((period) => ({
            key: `${period.year}-${period.quarter}`,
            label: `${getHouseReportQuarterLabel(period.quarter)} ${period.year}`,
            href: `/reports?period=quarter&year=${period.year}&quarter=${period.quarter}`,
            active:
              selectedQuarterPeriod?.year === period.year &&
              selectedQuarterPeriod.quarter === period.quarter,
          }))
        : selectedPeriodMode === "year"
          ? availableYears.map((year) => ({
              key: String(year),
              label: String(year),
              href: `/reports?period=year&year=${year}`,
              active: selectedYear === year,
            }))
          : [];

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={houseReportsCopy.page.title}
        description={`${houseReportsCopy.page.title} про виконані роботи та ключові оновлення будинку в одному місці.`}
      >
        <div className="grid gap-4">
          <PubFilterTabs items={periodModeTabs} framed={false} ariaLabel="Період звітів" />
          {valueTabs.length > 0 ? <PubFilterTabs items={valueTabs} /> : null}
        </div>
      </PubSectionHeader>

      <section>
        {filteredReports.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-sm text-[var(--pub-text-muted)]">
            {getEmptyMessage(selectedPeriodMode)}
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

                  <PubBadge tone="neutral" size="sm">
                    {getHouseReportPeriodLabel(report)}
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
