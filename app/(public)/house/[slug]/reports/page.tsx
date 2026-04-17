import { houseReportsCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    mode?: string;
    month?: string;
    year?: string;
  }>;
};

type PublicReport = {
  id: string;
  title: string;
  description: string;
  category: string;
  reportDate: string;
  periodType: "current" | "past";
  month?: string;
  year?: number;
  isPinned?: boolean;
  isNew?: boolean;
  newUntil?: string | null;
  status: "draft" | "active" | "archived";
  pdfFileName?: string;
  pdfPath?: string;
};

const MONTH_LABELS: Record<string, string> = houseReportsCopy.months;

function getMonthLabel(value: string) {
  return MONTH_LABELS[value] ?? value;
}

function isStillNew(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return houseReportsCopy.date.empty;

  return date.toLocaleDateString(houseReportsCopy.date.locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ReportsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const { house, sections } =
    await getPublishedHomeSectionsBySlug(slug);

  const districtColor = house.district?.theme_color ?? "#16a34a";

  const reportsSection = sections.find((item) => item.kind === "reports");

  const reports = Array.isArray(reportsSection?.content?.reports)
    ? (reportsSection.content.reports as PublicReport[])
    : [];

  const visibleReports = reports
    .filter(
      (item) =>
        item.status !== "archived" &&
        item.status !== "draft",
    )
    .sort((a, b) => {
      const aDate = new Date(a.reportDate).getTime() || 0;
      const bDate = new Date(b.reportDate).getTime() || 0;
      return bDate - aDate;
    });

  const currentYear = new Date().getFullYear();

  const currentReports = visibleReports.filter(
    (item) =>
      item.periodType === "current" &&
      new Date(item.reportDate).getFullYear() === currentYear,
  );

  const pastReports = visibleReports.filter((item) => item.periodType === "past");

  const currentYearReports = currentReports;

  function sortReportsForGrid(items: PublicReport[]) {
    return [...items].sort((left, right) => {
      const pinnedDiff =
        Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));

      if (pinnedDiff !== 0) {
        return pinnedDiff;
      }

      const leftDate = new Date(left.reportDate).getTime() || 0;
      const rightDate = new Date(right.reportDate).getTime() || 0;

      return rightDate - leftDate;
    });
  }

  const availableMonths = Array.from(
    new Set(
      currentReports
        .map((item) => item.month)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "ru"));

  const availableYears = Array.from(
    new Set(
      pastReports
        .map((item) => item.year)
        .filter((item): item is number => typeof item === "number"),
    ),
  ).sort((a, b) => b - a);

  const selectedMode =
    resolvedSearchParams.mode === "archive" ? "archive" : "current";

  const selectedMonth =
    resolvedSearchParams.month && availableMonths.includes(resolvedSearchParams.month)
      ? resolvedSearchParams.month
      : "all";

  const selectedYear =
    resolvedSearchParams.year ??
    (availableYears[0] ? String(availableYears[0]) : "all");

  const filteredReports =
    selectedMode === "archive"
      ? pastReports.filter((item) =>
          selectedYear === "all" ? true : String(item.year ?? "") === selectedYear,
        )
      : sortReportsForGrid(
          currentReports.filter((item) =>
            selectedMonth === "all" ? true : item.month === selectedMonth,
          ),
        );

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {houseReportsCopy.page.title}
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {houseReportsCopy.page.title} по выполненным работам и ключевым обновлениям дома в одном месте.
            </p>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap justify-center gap-3">
              {[
                {
                  key: "current",
                  label: houseReportsCopy.tabs.current,
                  href: `/house/${slug}/reports?mode=current&month=all`,
                  count: currentReports.length,
                },
                {
                  key: "archive",
                  label: houseReportsCopy.tabs.archive,
                  href: `/house/${slug}/reports?mode=archive&year=all`,
                  count: pastReports.length,
                },
              ].map((item) => {
                const isActive = selectedMode === item.key;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={isActive ? { backgroundColor: districtColor } : undefined}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-wrap justify-center gap-3">
              {selectedMode === "archive" ? (
              <>
                <Link
                  href={`/house/${slug}/reports?mode=archive&year=all`}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition ${
                    selectedYear === "all"
                      ? "text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  style={
                    selectedMode === "archive"
                      ? selectedYear === "all"
                        ? { backgroundColor: districtColor }
                        : undefined
                      : selectedMonth === "all"
                        ? { backgroundColor: districtColor }
                        : undefined
                  }
                >
                  {houseReportsCopy.filters.all}
                </Link>

                {availableYears.map((year) => (
                  <Link
                    key={year}
                    href={`/house/${slug}/reports?mode=archive&year=${year}`}
                    className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition ${
                      selectedYear === String(year)
                        ? "text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={
                      selectedYear === String(year)
                        ? { backgroundColor: districtColor }
                        : undefined
                    }
                  >
                    {year}
                  </Link>
                ))}
              </>
            ) : (
              <>
                <Link
                  href={`/house/${slug}/reports?mode=current&month=all`}
                  className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition ${
                    selectedMonth === "all"
                      ? "text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  style={
                    selectedMode === "archive"
                      ? selectedYear === "all"
                        ? { backgroundColor: districtColor }
                        : undefined
                      : selectedMonth === "all"
                        ? { backgroundColor: districtColor }
                        : undefined
                  }
                >
                  {houseReportsCopy.filters.all}
                </Link>

                {availableMonths.map((month) => (
                  <Link
                    key={month}
                    href={`/house/${slug}/reports?mode=current&month=${month}`}
                    className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition ${
                      selectedMonth === month
                        ? "text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={
                      selectedMonth === month
                        ? { backgroundColor: districtColor }
                        : undefined
                    }
                  >
                    {getMonthLabel(month)}
                  </Link>
                ))}
              </>
            )}
            </div>
          </div>
        </section>

        <section>
          {filteredReports.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-[var(--border)] bg-[var(--card)] p-6 text-[var(--muted)]">
              {selectedMode === "archive"
                ? "Архив отчетов за выбранный период пока пуст."
                : "{houseReportsCopy.page.title} текущего года пока не опубликованы."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-[28px] border border-[var(--border)] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      {report.category}
                    </span>

                    {report.isPinned ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                        Важный
                      </span>
                    ) : null}

                    {report.isNew && isStillNew(report.newUntil) ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                        Новый
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 text-lg font-semibold">
                    {report.title}
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {report.description}
                  </p>

                  <div className="mt-4 text-sm text-slate-500">
                    {formatDate(report.reportDate)}
                  </div>

                  <PublicReportPdfViewer
                    filePath={report.pdfPath ?? ""}
                    fileName={report.pdfFileName}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
