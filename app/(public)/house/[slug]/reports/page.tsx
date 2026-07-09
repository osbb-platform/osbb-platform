import { notFound } from "next/navigation";
import { houseReportsCopy } from "@/src/shared/publicCopy/house";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseReports } from "@/src/modules/houses/services/getPublishedHouseReports";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";
import type { HouseReportSnapshot } from "@/src/modules/houses/services/getAdminHouseReports";

type PeriodFilterMode = "all" | "month" | "quarter" | "year";

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

const QUARTER_LABELS: Record<number, string> = {
  1: "I квартал",
  2: "II квартал",
  3: "III квартал",
  4: "IV квартал",
};

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

function formatMonthValue(value: number | null) {
  return value ? String(value).padStart(2, "0") : null;
}

function getReportPeriodLabel(report: HouseReportSnapshot) {
  if (report.periodKind === "month" && report.periodMonth && report.periodYear) {
    return `${getMonthLabel(formatMonthValue(report.periodMonth) ?? "")} ${report.periodYear}`;
  }

  if (report.periodKind === "quarter" && report.periodQuarter && report.periodYear) {
    return `${QUARTER_LABELS[report.periodQuarter] ?? `${report.periodQuarter} квартал`} ${report.periodYear}`;
  }

  if (report.periodKind === "year" && report.periodYear) {
    return String(report.periodYear);
  }

  return "Без періоду";
}

function getPeriodSortKey(report: HouseReportSnapshot) {
  if (!report.periodYear) {
    return -1;
  }

  if (report.periodKind === "year") {
    return report.periodYear * 100 + 13;
  }

  if (report.periodKind === "quarter" && report.periodQuarter) {
    return report.periodYear * 100 + report.periodQuarter * 3;
  }

  if (report.periodKind === "month" && report.periodMonth) {
    return report.periodYear * 100 + report.periodMonth;
  }

  return -1;
}

function sortReportsForGrid(items: HouseReportSnapshot[]) {
  return [...items].sort((left, right) => {
    const pinnedDiff =
      Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));

    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }

    const periodDiff = getPeriodSortKey(right) - getPeriodSortKey(left);

    if (periodDiff !== 0) {
      return periodDiff;
    }

    const leftDate = new Date(left.reportDate ?? left.publishedAt ?? left.updatedAt).getTime() || 0;
    const rightDate = new Date(right.reportDate ?? right.publishedAt ?? right.updatedAt).getTime() || 0;
    const dateDiff = rightDate - leftDate;

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return left.title.localeCompare(right.title, "uk", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function isPeriodFilterMode(value: unknown): value is PeriodFilterMode {
  return value === "all" || value === "month" || value === "quarter" || value === "year";
}

function resolvePeriodFilterMode(params: {
  period?: string;
  mode?: string;
}): PeriodFilterMode {
  if (isPeriodFilterMode(params.period)) {
    return params.period;
  }

  if (params.mode === "current") {
    return "month";
  }

  if (params.mode === "past" || params.mode === "archive") {
    return "year";
  }

  return "all";
}

function getEmptyMessage(periodMode: PeriodFilterMode) {
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
  const sortedReports = sortReportsForGrid(reports);
  const selectedPeriodMode = resolvePeriodFilterMode(resolvedSearchParams);

  const monthReports = sortedReports.filter(
    (item) => item.periodKind === "month" && item.periodMonth && item.periodYear,
  );
  const quarterReports = sortedReports.filter(
    (item) => item.periodKind === "quarter" && item.periodQuarter && item.periodYear,
  );
  const yearReports = sortedReports.filter(
    (item) => item.periodKind === "year" && item.periodYear,
  );

  const availableMonthPeriods = Array.from(
    new Map(
      monthReports.map((item) => {
        const month = formatMonthValue(item.periodMonth);
        return [
          `${item.periodYear}-${month}`,
          {
            year: item.periodYear as number,
            month: month as string,
          },
        ];
      }),
    ).values(),
  ).sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;

    const leftIndex = MONTH_INDEX.get(left.month) ?? -1;
    const rightIndex = MONTH_INDEX.get(right.month) ?? -1;
    return rightIndex - leftIndex;
  });

  const availableQuarterPeriods = Array.from(
    new Map(
      quarterReports.map((item) => [
        `${item.periodYear}-${item.periodQuarter}`,
        {
          year: item.periodYear as number,
          quarter: item.periodQuarter as number,
        },
      ]),
    ).values(),
  ).sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;
    return right.quarter - left.quarter;
  });

  const availableYears = Array.from(
    new Set(
      yearReports
        .map((item) => item.periodYear)
        .filter((item): item is number => typeof item === "number"),
    ),
  ).sort((left, right) => right - left);

  const requestedMonthPeriod = availableMonthPeriods.find(
    (item) =>
      resolvedSearchParams.month === item.month &&
      Number(resolvedSearchParams.year) === item.year,
  );
  const selectedMonthPeriod = requestedMonthPeriod ?? availableMonthPeriods[0] ?? null;

  const requestedQuarterPeriod = availableQuarterPeriods.find(
    (item) =>
      Number(resolvedSearchParams.quarter) === item.quarter &&
      Number(resolvedSearchParams.year) === item.year,
  );
  const selectedQuarterPeriod = requestedQuarterPeriod ?? availableQuarterPeriods[0] ?? null;

  const requestedYear = availableYears.find(
    (year) => Number(resolvedSearchParams.year) === year,
  );
  const selectedYear = requestedYear ?? availableYears[0] ?? null;

  const filteredReports =
    selectedPeriodMode === "month"
      ? sortReportsForGrid(
          monthReports.filter(
            (item) =>
              selectedMonthPeriod &&
              item.periodYear === selectedMonthPeriod.year &&
              formatMonthValue(item.periodMonth) === selectedMonthPeriod.month,
          ),
        )
      : selectedPeriodMode === "quarter"
        ? sortReportsForGrid(
            quarterReports.filter(
              (item) =>
                selectedQuarterPeriod &&
                item.periodYear === selectedQuarterPeriod.year &&
                item.periodQuarter === selectedQuarterPeriod.quarter,
            ),
          )
        : selectedPeriodMode === "year"
          ? sortReportsForGrid(
              yearReports.filter((item) =>
                selectedYear ? item.periodYear === selectedYear : false,
              ),
            )
          : sortedReports;

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
      count: monthReports.length,
      active: selectedPeriodMode === "month",
    },
    {
      key: "quarter",
      label: "Квартал",
      href: selectedQuarterPeriod
        ? `/reports?period=quarter&year=${selectedQuarterPeriod.year}&quarter=${selectedQuarterPeriod.quarter}`
        : "/reports?period=quarter",
      count: quarterReports.length,
      active: selectedPeriodMode === "quarter",
    },
    {
      key: "year",
      label: "Рік",
      href: selectedYear ? `/reports?period=year&year=${selectedYear}` : "/reports?period=year",
      count: yearReports.length,
      active: selectedPeriodMode === "year",
    },
  ];

  const valueTabs: PubFilterTabItem[] =
    selectedPeriodMode === "month"
      ? availableMonthPeriods.map((period) => ({
          key: `${period.year}-${period.month}`,
          label: `${getMonthLabel(period.month)} ${period.year}`,
          href: `/reports?period=month&year=${period.year}&month=${period.month}`,
          active:
            selectedMonthPeriod?.year === period.year &&
            selectedMonthPeriod.month === period.month,
        }))
      : selectedPeriodMode === "quarter"
        ? availableQuarterPeriods.map((period) => ({
            key: `${period.year}-${period.quarter}`,
            label: `${QUARTER_LABELS[period.quarter] ?? `${period.quarter} квартал`} ${period.year}`,
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
                    {getReportPeriodLabel(report)}
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
