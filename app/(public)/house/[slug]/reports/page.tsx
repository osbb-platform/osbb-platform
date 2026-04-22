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
    <section className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid min-w-0 gap-6">
        <section className="w-full min-w-0 rounded-[36px] border border-[#E4DBD1] bg-[#F3EEE8] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200  hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:p-8 lg:p-10">
          <div className="min-w-0 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-[#1F2A37] sm:text-5xl lg:text-6xl">
              {houseReportsCopy.page.title}
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#5B6B7C] sm:text-lg">
              {houseReportsCopy.page.title} про виконані роботи та ключові оновлення будинку в одному місці.
            </p>
          </div>

          <div className="mt-8">
            <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
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
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
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
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                        isActive
                          ? "bg-[#D9CFC3] text-[#1F2A44] border-[#C4B7A7]"
                          : "bg-[#E7DED3] text-[#2F3A4F] border-[#D2C6B8]"
                      }`}
                    >
                      {item.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-5 w-full min-w-0 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200  hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
            <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
              {selectedMode === "archive" ? (
              <>
                <Link
                  href={`/house/${slug}/reports?mode=archive&year=all`}
                  className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
                    selectedYear === "all"
                      ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                      : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                  }`}
                  style={
                    selectedYear === "all"
                      ? {
                          "--tab-active-bg": `${districtColor}20`,
                          "--tab-active-text": "#1F2A37",
                          borderColor: districtColor,
                        } as React.CSSProperties
                      : undefined
                  }
                >
                  {houseReportsCopy.filters.all}
                </Link>

                {availableYears.map((year) => (
                  <Link
                    key={year}
                    href={`/house/${slug}/reports?mode=archive&year=${year}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
                      selectedYear === String(year)
                        ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                        : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                    }`}
                    style={
                      selectedYear === String(year)
                        ? {
                            "--tab-active-bg": `${districtColor}20`,
                            "--tab-active-text": "#1F2A37",
                            borderColor: districtColor,
                          } as React.CSSProperties
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
                  className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
                    selectedMonth === "all"
                      ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                      : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                  }`}
                  style={
                    selectedYear === "all"
                      ? {
                          "--tab-active-bg": `${districtColor}20`,
                          "--tab-active-text": "#1F2A37",
                          borderColor: districtColor,
                        } as React.CSSProperties
                      : undefined
                  }
                >
                  {houseReportsCopy.filters.all}
                </Link>

                {availableMonths.map((month) => (
                  <Link
                    key={month}
                    href={`/house/${slug}/reports?mode=current&month=${month}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
                      selectedMonth === month
                        ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                        : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                    }`}
                    style={
                      selectedMonth === month
                        ? {
                            "--tab-active-bg": `${districtColor}20`,
                            "--tab-active-text": "#1F2A37",
                            borderColor: districtColor,
                          } as React.CSSProperties
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
            <div className="rounded-[24px] border border-dashed border-[#E2D8CC] bg-[var(--card)] p-4 text-sm text-[var(--muted)] sm:rounded-[32px] sm:p-6">
              {selectedMode === "archive"
                ? "Архів звітів за обраний період поки порожній."
                : `${houseReportsCopy.page.title} поточного року поки не опубліковані.`}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredReports.map((report) => (
                <article
                  key={report.id}
                  className="w-full min-w-0 rounded-[22px] border border-[#E2D8CC] bg-[#F9F6F2] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200  hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#E7DED3] px-3 py-1 text-xs font-medium">
                      {report.category}
                    </span>

                    {report.isPinned ? (
                      <span className="rounded-full bg-[#F1E7DF] px-3 py-1 text-xs font-medium text-[#7A4B2F] border border-[#E2D3C2]">
                        Важливе
                      </span>
                    ) : null}

                    {report.isNew && isStillNew(report.newUntil) ? (
                      <span className="rounded-full bg-[#E6EFE8] px-3 py-1 text-xs font-medium text-[#2F6F4F] border border-[#D4E3D8]">
                        Нове
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 break-words text-base font-semibold sm:text-lg">
                    {report.title}
                  </div>

                  <p className="mt-3 break-words text-sm leading-7 text-[#5B6B7C]">
                    {report.description}
                  </p>

                  <div className="mt-4 text-sm text-[#5F5A54]">
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
