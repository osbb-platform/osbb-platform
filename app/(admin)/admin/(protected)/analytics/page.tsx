import Link from "next/link";
import { redirect } from "next/navigation";
import { getAnalyticsAccess } from "@/src/modules/analytics/services/getAnalyticsAccess";
import { getAnalyticsBySection } from "@/src/modules/analytics/services/getAnalyticsBySection";
import { getAnalyticsHouseOptions } from "@/src/modules/analytics/services/getAnalyticsHouseOptions";
import { getAnalyticsOverview } from "@/src/modules/analytics/services/getAnalyticsOverview";
import { getAnalyticsRequests } from "@/src/modules/analytics/services/getAnalyticsRequests";
import type { AnalyticsFilter } from "@/src/modules/analytics/services/types";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

type AnalyticsTab = "overview" | "sections" | "access" | "requests";
type AnalyticsPreset = 30 | 60 | 90;

type AdminAnalyticsPageProps = {
  searchParams?: Promise<{
    houseId?: string;
    from?: string;
    to?: string;
    tab?: string;
  }>;
};

const ANALYTICS_TABS: Array<{ key: AnalyticsTab; label: string }> = [
  { key: "overview", label: "Огляд" },
  { key: "sections", label: "Розділи" },
  { key: "access", label: "Доступ" },
  { key: "requests", label: "Звернення" },
];

const PRESETS: AnalyticsPreset[] = [30, 60, 90];

const SECTION_LABELS: Record<string, string> = {
  home: "Головна",
  announcements: "Оголошення",
  information: "Інформація",
  board: "Правління",
  specialists: "Спеціалісти",
  reports: "Звіти",
  plan: "План робіт",
  meetings: "Збори",
  debtors: "Боржники",
  requisites: "Реквізити",
  "founding-documents": "Статутні документи",
  unknown: "Інше",
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPresetRange(days: AnalyticsPreset | number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function getDefaultDateRange() {
  return getPresetRange(30);
}

function normalizeTab(value: string | undefined): AnalyticsTab {
  if (
    value === "overview" ||
    value === "sections" ||
    value === "access" ||
    value === "requests"
  ) {
    return value;
  }

  return "overview";
}

function buildQueryString(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(current).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

function detectActivePreset(from: string, to: string) {
  return PRESETS.find((preset) => {
    const range = getPresetRange(preset);
    return range.from === from && range.to === to;
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("uk-UA").format(value);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSectionLabel(sectionKey: string) {
  return SECTION_LABELS[sectionKey] ?? sectionKey;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-5 py-8 text-center text-sm leading-6 text-[var(--cms-text-muted)]">
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5 shadow-sm">
      <div className="text-sm text-[var(--cms-text-muted)]">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-[var(--cms-text)]">
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-xs leading-5 text-[var(--cms-text-muted)]">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AdminAnalyticsPageProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser?.role) {
    redirect("/admin/login");
  }

  assertTopLevelAccess(currentUser.role, "analytics");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaults = getDefaultDateRange();

  const activeTab = normalizeTab(resolvedSearchParams.tab);
  const filter: AnalyticsFilter = {
    houseId: resolvedSearchParams.houseId || undefined,
    from: resolvedSearchParams.from || defaults.from,
    to: resolvedSearchParams.to || defaults.to,
  };

  const currentParams = {
    houseId: filter.houseId,
    from: filter.from,
    to: filter.to,
    tab: activeTab,
  };

  const activePreset = detectActivePreset(filter.from, filter.to);

  const [houses, overview, sections, access, requests] = await Promise.all([
    getAnalyticsHouseOptions(),
    getAnalyticsOverview(filter),
    getAnalyticsBySection(filter),
    getAnalyticsAccess(filter),
    getAnalyticsRequests(filter),
  ]);

  const activeHouseName =
    houses.find((house) => house.id === filter.houseId)?.name ?? "Усі будинки";

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
              NEW
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--cms-text)]">
              Аналітика
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cms-text-muted)]">
              Активність мешканців на публічних сторінках, входи по коду,
              перегляди розділів, PDF-документи та заявки до спеціалістів.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-sm text-[var(--cms-text-muted)]">
            Будинок:{" "}
            <span className="font-semibold text-[var(--cms-text)]">
              {activeHouseName}
            </span>
            <br />
            Період:{" "}
            <span className="font-semibold text-[var(--cms-text)]">
              {formatDate(filter.from)}
            </span>{" "}
            —{" "}
            <span className="font-semibold text-[var(--cms-text)]">
              {formatDate(filter.to)}
            </span>
          </div>
        </div>
      </div>

      <div className="sticky top-4 z-20 space-y-3">
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const href = `/admin/analytics?${buildQueryString(currentParams, {
                tab: tab.key,
              })}`;

              return (
                <Link
                  key={tab.key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "border-[var(--cms-border-secondary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                      : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text)] hover:bg-[var(--cms-bg-tertiary)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
              Фільтри аналітики
            </div>

            <Link
              href={`/admin/analytics?${buildQueryString(currentParams, {
                houseId: null,
                from: defaults.from,
                to: defaults.to,
                tab: "overview",
              })}`}
              className="text-sm text-[var(--cms-text-muted)] underline decoration-[var(--cms-border-secondary)] underline-offset-4 transition hover:text-[var(--cms-text)]"
            >
              Скинути
            </Link>
          </div>

          <form action="/admin/analytics" className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
            <input type="hidden" name="tab" value={activeTab} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text)]">
                Будинок
              </label>
              <select
                name="houseId"
                defaultValue={filter.houseId ?? ""}
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="">Усі будинки</option>
                {houses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text)]">
                Від
              </label>
              <input
                type="date"
                name="from"
                defaultValue={filter.from}
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text)]">
                До
              </label>
              <input
                type="date"
                name="to"
                defaultValue={filter.to}
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--cms-border-secondary)] bg-[var(--cms-bg-tertiary)] px-5 py-2.5 text-sm font-semibold text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-secondary)] transition hover:bg-[var(--cms-bg-secondary)]"
              >
                Застосувати
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const range = getPresetRange(preset);
              const isActive = activePreset === preset;
              const href = `/admin/analytics?${buildQueryString(currentParams, {
                from: range.from,
                to: range.to,
              })}`;

              return (
                <Link
                  key={preset}
                  href={href}
                  className={`inline-flex rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[var(--cms-border-secondary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                      : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)] hover:bg-[var(--cms-bg-tertiary)] hover:text-[var(--cms-text)]"
                  }`}
                >
                  {preset} днів
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard label="Унікальні сесії" value={formatNumber(overview.kpi.uniqueSessions)} />
            <KpiCard label="Візити" value={formatNumber(overview.kpi.totalVisits)} />
            <KpiCard label="Перегляди розділів" value={formatNumber(overview.kpi.sectionViews)} />
            <KpiCard label="PDF відкрито" value={formatNumber(overview.kpi.documentOpens)} />
            <KpiCard label="Заявки" value={formatNumber(requests.total)} />
            <KpiCard
              label="Успішність входу"
              value={`${overview.kpi.passwordSuccessRate}%`}
              hint={`${formatNumber(overview.kpi.passwordSuccess)} успішно / ${formatNumber(overview.kpi.passwordFail)} помилок`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Динаміка по днях
              </h2>

              <div className="mt-4 space-y-3">
                {overview.daily.length ? (
                  overview.daily.slice(-14).map((item) => (
                    <div
                      key={item.date}
                      className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-[var(--cms-text)]">
                          {formatDate(item.date)}
                        </div>
                        <div className="text-sm text-[var(--cms-text-muted)]">
                          {formatNumber(item.totalEvents)} подій
                        </div>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[var(--cms-text-muted)]">
                        Візити: {formatNumber(item.visits)} · Розділи:{" "}
                        {formatNumber(item.sectionViews)} · Входи:{" "}
                        {formatNumber(item.passwordSuccess)} · Помилки:{" "}
                        {formatNumber(item.passwordFail)} · Заявки:{" "}
                        {formatNumber(item.contactRequests)}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>За вибраний період подій ще немає.</EmptyState>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Топ будинків
              </h2>

              <div className="mt-4 space-y-3">
                {overview.topHouses.length ? (
                  overview.topHouses.map((house) => (
                    <div
                      key={house.houseId}
                      className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                    >
                      <div className="font-medium text-[var(--cms-text)]">
                        {house.houseName}
                      </div>
                      <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                        {formatNumber(house.totalEvents)} подій ·{" "}
                        {formatNumber(house.uniqueSessions)} сесій
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>
                    Топ будинків з’явиться, коли фільтр встановлений на всі будинки
                    і в аналітиці будуть події.
                  </EmptyState>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "sections" ? (
        <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            Популярність розділів
          </h2>

          <div className="mt-5 space-y-4">
            {sections.length ? (
              sections.map((section) => (
                <div key={section.sectionKey}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-[var(--cms-text)]">
                      {getSectionLabel(section.sectionKey)}
                    </span>
                    <span className="text-[var(--cms-text-muted)]">
                      {formatNumber(section.views)} · {section.share}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[var(--cms-bg-secondary)]">
                    <div
                      className="h-full rounded-full bg-[var(--cms-border-secondary)]"
                      style={{ width: `${Math.max(section.share, 2)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Переглядів розділів за вибраний період ще немає.</EmptyState>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "access" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">
              Входи по днях
            </h2>

            <div className="mt-4 space-y-3">
              {access.daily.length ? (
                access.daily.map((item) => (
                  <div
                    key={item.date}
                    className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                  >
                    <div className="font-medium text-[var(--cms-text)]">
                      {formatDate(item.date)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                      Успішно: {formatNumber(item.success)} · Помилки:{" "}
                      {formatNumber(item.fail)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Спроб входу за вибраний період ще немає.</EmptyState>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">
              Активні години
            </h2>

            <div className="mt-4 space-y-3">
              {access.hourly.length ? (
                access.hourly.slice(0, 12).map((item) => (
                  <div
                    key={item.hour}
                    className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                  >
                    <div className="font-medium text-[var(--cms-text)]">
                      {String(item.hour).padStart(2, "0")}:00
                    </div>
                    <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                      Усього: {formatNumber(item.total)} · Успішно:{" "}
                      {formatNumber(item.success)} · Помилки: {formatNumber(item.fail)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState>Дані по годинах з’являться після перших входів.</EmptyState>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "requests" ? (
        <div className="rounded-[28px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                Звернення мешканців
              </h2>
              <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
                Усього за період: {formatNumber(requests.total)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {requests.latest.length ? (
              requests.latest.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-4"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-medium text-[var(--cms-text)]">
                        {request.specialistLabel || request.subject || "Звернення"}
                      </div>
                      <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                        {request.requesterName || "Без імені"}
                        {request.apartment ? ` · кв. ${request.apartment}` : ""}
                      </div>
                    </div>
                    <div className="text-sm text-[var(--cms-text-muted)]">
                      {formatDateTime(request.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState>Звернень за вибраний період ще немає.</EmptyState>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
