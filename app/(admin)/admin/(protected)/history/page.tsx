import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminDistricts } from "@/src/modules/districts/services/getAdminDistricts";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";
import { HistoryToolbar } from "@/src/modules/history/components/HistoryToolbar";
import {
  getPlatformChangeHistory,
  type PlatformHistoryTab,
  type PlatformHistorySort,
} from "@/src/modules/history/services/getPlatformChangeHistory";
import { getPlatformHistoryFilterOptions } from "@/src/modules/history/services/getPlatformHistoryFilterOptions";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";
import {
  getActionIcon,
  getActionTone,
} from "@/src/modules/history/services/historyLabels";

type AdminHistoryPageProps = {
  searchParams?: Promise<{
    tab?: PlatformHistoryTab;
    page?: string;
    sort?: PlatformHistorySort;
    actor?: string;
    mainSection?: string;
    subSection?: string;
    districtId?: string;
    houseId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTab(value: string | undefined): PlatformHistoryTab {
  if (value === "cms" || value === "incoming" || value === "all") {
    return value;
  }

  return "all";
}

function normalizeSort(value: string | undefined): PlatformHistorySort {
  if (value === "date_asc" || value === "date_desc") {
    return value;
  }

  return "date_desc";
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function buildQueryString(
  current: Record<string, string>,
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

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  if (currentPage - 2 > 1) pages.add(currentPage - 2);
  if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

  return Array.from(pages).sort((left, right) => left - right);
}

function getRetentionMessage(tab: PlatformHistoryTab) {
  if (tab === "cms") {
    return "У вкладці відображаються CMS-події за останні 60 днів. Старіші записи автоматично очищаються в Supabase.";
  }

  if (tab === "incoming") {
    return "У вкладці відображаються вхідні події за останні 90 днів. Старіші записи автоматично очищаються в Supabase.";
  }

  return "Історія відображається відповідно до політики зберігання: CMS — 60 днів, вхідні події — 90 днів. Старі записи очищаються автоматично.";
}

function getSourceBadgeClasses(sourceType: "cms" | "house_portal") {
  return sourceType === "house_portal"
    ? "border-emerald-800 bg-emerald-950/60 text-emerald-200"
    : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text-secondary)]";
}



function getActionIconClasses(actionTone: ReturnType<typeof getActionTone>) {
  if (actionTone === "create") {
    return "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (actionTone === "edit") {
    return "border border-sky-300 bg-sky-50 text-sky-700";
  }

  if (actionTone === "confirm") {
    return "border-violet-800 bg-violet-950/50 text-violet-200";
  }

  if (actionTone === "archive") {
    return "border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]";
  }

  if (actionTone === "restore") {
    return "border-cyan-800 bg-cyan-950/50 text-cyan-200";
  }

  if (actionTone === "delete") {
    return "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]";
  }

  if (actionTone === "incoming") {
    return "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (actionTone === "access") {
    return "border border-orange-300 bg-orange-50 text-orange-700";
  }

  return "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]";
}

function getEmptyStateCopy(params: {
  tab: PlatformHistoryTab;
  districtId: string;
  houseId: string;
  hasFilters: boolean;
}) {
  const { tab, districtId, houseId, hasFilters } = params;

  if (tab === "incoming" && !districtId) {
    return {
      title: "Спочатку оберіть район",
      description:
        "Після вибору району стануть доступні будинок, розділ сайту, період і сортування для вхідних подій.",
    };
  }

  if (tab === "incoming" && districtId && houseId) {
    return {
      title: "За обраним будинком подій не знайдено",
      description:
        "Спробуйте змінити період, обрати інший розділ сайту або скинути фільтри вхідних подій.",
    };
  }

  if (tab === "incoming") {
    return {
      title: "У вхідних подіях поки порожньо",
      description:
        "Для обраного району та поточних фільтрів нових звернень поки не знайдено.",
    };
  }

  if (tab === "cms" && hasFilters) {
    return {
      title: "За фільтрами нічого не знайдено",
      description:
        "Змініть співробітника, розділ, підрозділ або період, щоб побачити відповідні записи журналу дій.",
    };
  }

  if (tab === "cms") {
    return {
      title: "Журнал дій поки порожній",
      description:
        "Коли співробітники почнуть працювати з CMS, тут з’являться системні події за розділами платформи.",
    };
  }

  return {
    title: "Історія поки порожня",
    description:
      "Коли в системі з’являться дії співробітників або вхідні події з сайтів будинків, вони відображатимуться тут.",
  };
}

export default async function AdminHistoryPage({
  searchParams,
}: AdminHistoryPageProps) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    redirect("/admin/login");
  }

  assertTopLevelAccess(currentUser.role, "history");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tab = normalizeTab(resolvedSearchParams.tab);
  const page = normalizePage(resolvedSearchParams.page);
  const sort = normalizeSort(resolvedSearchParams.sort);
  const actor = (resolvedSearchParams.actor ?? "").trim();
  const mainSection = (resolvedSearchParams.mainSection ?? "").trim();
  const subSection = (resolvedSearchParams.subSection ?? "").trim();
  const districtId = (resolvedSearchParams.districtId ?? "").trim();
  const houseId = (resolvedSearchParams.houseId ?? "").trim();
  const dateFrom = (resolvedSearchParams.dateFrom ?? "").trim();
  const dateTo = (resolvedSearchParams.dateTo ?? "").trim();

  const [filterOptions, districts, houses] = await Promise.all([
    getPlatformHistoryFilterOptions(),
    getAdminDistricts(),
    getAdminHouses(),
  ]);

  const housesForSelectedDistrict = districtId
    ? houses.filter((house) => house.district?.id === districtId)
    : [];

  const districtHouseIds = housesForSelectedDistrict.map((house) => house.id);

  const currentActorLabel =
    String(currentUser.fullName ?? "").trim() ||
    String(currentUser.email ?? "").trim();

  const cmsActors = Array.from(
    new Set(
      [currentActorLabel, ...filterOptions.cmsActors]
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "uk"));

  const result = await getPlatformChangeHistory({
    tab,
    page,
    pageSize: 25,
    sort,
    actor: tab === "cms" ? actor : "",
    mainSection: tab === "cms" ? mainSection : "",
    subSection: tab === "all" ? "" : subSection,
    districtHouseIds: tab === "incoming" && districtId ? districtHouseIds : [],
    houseId: tab === "incoming" ? houseId : "",
    dateFrom: tab === "all" ? "" : dateFrom,
    dateTo: tab === "all" ? "" : dateTo,
  });

  const currentParams = {
    tab,
    page: String(page),
    sort,
    actor,
    mainSection,
    subSection,
    districtId,
    houseId,
    dateFrom,
    dateTo,
  };

  const pageNumbers = getPageNumbers(result.page, result.totalPages);

  const emptyState = getEmptyStateCopy({
    tab,
    districtId,
    houseId,
    hasFilters: Boolean(
      actor ||
        mainSection ||
        subSection ||
        districtId ||
        houseId ||
        dateFrom ||
        dateTo,
    ),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
          Історія
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
          Історія
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--cms-text-secondary)]">
          Загальний журнал дій співробітників платформи та вхідних подій із сайтів будинків.
        </p>
      </div>

      <HistoryToolbar
        tab={tab}
        sort={sort}
        actor={actor}
        mainSection={mainSection}
        subSection={subSection}
        districtId={districtId}
        houseId={houseId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        cmsActors={cmsActors}
        cmsSections={filterOptions.cmsSections}
        incomingSections={filterOptions.incomingSections}
        districts={districts.map((district) => ({
          id: district.id,
          name: district.name,
        }))}
        houses={houses.map((house) => ({
          id: house.id,
          name: house.name,
          districtId: house.district?.id ?? null,
        }))}
      />

      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
        <div className="mb-4 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-700">
          {getRetentionMessage(tab)}
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
            {tab === "all"
              ? "Усі події"
              : tab === "cms"
                ? "CMS події"
                : "Події будинків"}
          </h2>

          <div className="text-sm text-[var(--cms-text-secondary)]">
            Записів: {result.totalCount}
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-6 py-8">
            <div className="text-lg font-semibold text-[var(--cms-text-primary)]">
              {emptyState.title}
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cms-text-secondary)]">
              {emptyState.description}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--cms-border-primary)]">
            <div className="min-w-[1320px]">
              <div className="grid grid-cols-[72px_180px_140px_220px_180px_180px_220px] gap-3 border-b border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                <div>Дія</div>
                <div>Дата</div>
                <div>Потік</div>
                <div>Об’єкт</div>
                <div>Розділ</div>
                <div>Підрозділ</div>
                <div>Автор</div>
              </div>

            <div className="max-h-[640px] overflow-y-auto">
              {result.items.map((item) => {
                const actorRaw =
                  item.source_type === "house_portal"
                    ? item.actor_email ??
                      item.metadata?.apartment ??
                      item.actor_name ??
                      "Автор не вказаний"
                    : item.actor_name ??
                      item.actor_email ??
                      "Співробітник не вказаний";

                const actorText =
                  typeof actorRaw === "string"
                    ? actorRaw
                    : JSON.stringify(actorRaw);

                const actionTone = getActionTone(item.action_label);
                const houseText = item.house_name ?? item.house_slug ?? "—";

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[72px_180px_140px_220px_180px_180px_220px] gap-3 border-b border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] px-4 py-3 text-sm transition hover:bg-[var(--cms-bg-secondary)]"
                  >
                    <div>
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-semibold ${getActionIconClasses(
                          actionTone,
                        )}`}
                      >
                        {getActionIcon(item.action_label)}
                      </span>
                    </div>

                    <div className="text-[var(--cms-text-secondary)]">
                      {formatDate(item.created_at)}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getSourceBadgeClasses(
                          item.source_type,
                        )}`}
                      >
                        {item.source_type === "house_portal"
                          ? "Вхідне"
                          : "CMS"}
                      </span>
                    </div>

                    <div className="text-[var(--cms-text-secondary)]">
                      <div>{item.entity_label ?? "Об’єкт не вказано"}</div>
                      <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
                        {houseText}
                      </div>
                      <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
                        {String(item.description ?? "—")}
                      </div>
                    </div>

                    <div className="text-[var(--cms-text-primary)]">
                      {String(item.main_section_label ?? "—")}
                    </div>

                    <div className="text-[var(--cms-text-secondary)]">
                      {String(item.sub_section_label ?? "—")}
                    </div>

                    <div className="text-[var(--cms-text-secondary)]">{actorText}</div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {result.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-end gap-2">
            <a
              href={`/admin/history?${buildQueryString(currentParams, {
                page: result.page > 1 ? result.page - 1 : 1,
              })}`}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition ${
                result.page > 1
                  ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-secondary)]"
                  : "pointer-events-none border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
              }`}
            >
              ‹
            </a>

            {pageNumbers.map((pageNumber, index) => {
              const previous = pageNumbers[index - 1];
              const showGap = previous && pageNumber - previous > 1;
              const isActive = pageNumber === result.page;

              return (
                <span key={pageNumber} className="flex items-center gap-2">
                  {showGap ? (
                    <span className="px-1 text-sm text-[var(--cms-text-muted)]">…</span>
                  ) : null}

                  <a
                    href={`/admin/history?${buildQueryString(currentParams, {
                      page: pageNumber,
                    })}`}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[var(--cms-accent-primary)] text-[var(--cms-accent-foreground)]"
                        : "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-secondary)]"
                    }`}
                  >
                    {pageNumber}
                  </a>
                </span>
              );
            })}

            <a
              href={`/admin/history?${buildQueryString(currentParams, {
                page:
                  result.page < result.totalPages
                    ? result.page + 1
                    : result.totalPages,
              })}`}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition ${
                result.page < result.totalPages
                  ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-secondary)]"
                  : "pointer-events-none border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
              }`}
            >
              ›
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
