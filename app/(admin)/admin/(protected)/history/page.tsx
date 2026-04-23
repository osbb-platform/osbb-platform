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

  return date.toLocaleString("ru-RU", {
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
    : "border-slate-700 bg-slate-800 text-slate-200";
}



function getActionIconClasses(actionTone: ReturnType<typeof getActionTone>) {
  if (actionTone === "create") {
    return "border-emerald-800 bg-emerald-950/50 text-emerald-200";
  }

  if (actionTone === "edit") {
    return "border-blue-800 bg-blue-950/50 text-blue-200";
  }

  if (actionTone === "confirm") {
    return "border-violet-800 bg-violet-950/50 text-violet-200";
  }

  if (actionTone === "archive") {
    return "border-amber-800 bg-amber-950/50 text-amber-200";
  }

  if (actionTone === "restore") {
    return "border-cyan-800 bg-cyan-950/50 text-cyan-200";
  }

  if (actionTone === "delete") {
    return "border-rose-800 bg-rose-950/50 text-rose-200";
  }

  if (actionTone === "incoming") {
    return "border-emerald-800 bg-emerald-950/50 text-emerald-200";
  }

  if (actionTone === "access") {
    return "border-orange-800 bg-orange-950/50 text-orange-200";
  }

  return "border-slate-700 bg-slate-800 text-slate-200";
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
  ).sort((left, right) => left.localeCompare(right, "ru"));

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
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
          Історія
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Історія
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
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

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 rounded-2xl border border-blue-900/60 bg-blue-950/40 px-4 py-3 text-sm leading-6 text-blue-200">
          {getRetentionMessage(tab)}
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">
            {tab === "all"
              ? "Усі події"
              : tab === "cms"
                ? "CMS події"
                : "Події будинків"}
          </h2>

          <div className="text-sm text-slate-400">
            Записів: {result.totalCount}
          </div>
        </div>

        {result.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-8">
            <div className="text-lg font-semibold text-white">
              {emptyState.title}
            </div>
            <div className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {emptyState.description}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <div className="min-w-[1320px]">
              <div className="grid grid-cols-[72px_180px_140px_220px_180px_180px_220px] gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                    className="grid grid-cols-[72px_180px_140px_220px_180px_180px_220px] gap-3 border-b border-slate-800 bg-slate-950/40 px-4 py-3 text-sm transition hover:bg-slate-900/70"
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

                    <div className="text-slate-400">
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

                    <div className="text-slate-300">
                      <div>{item.entity_label ?? "Об’єкт не вказано"}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {houseText}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {String(item.description ?? "—")}
                      </div>
                    </div>

                    <div className="text-slate-200">
                      {String(item.main_section_label ?? "—")}
                    </div>

                    <div className="text-slate-300">
                      {String(item.sub_section_label ?? "—")}
                    </div>

                    <div className="text-slate-300">{actorText}</div>
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
                  ? "border-slate-700 bg-slate-950 text-white hover:bg-slate-800"
                  : "pointer-events-none border-slate-800 bg-slate-900 text-slate-600"
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
                    <span className="px-1 text-sm text-slate-500">…</span>
                  ) : null}

                  <a
                    href={`/admin/history?${buildQueryString(currentParams, {
                      page: pageNumber,
                    })}`}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950"
                        : "border border-slate-700 bg-slate-950 text-white hover:bg-slate-800"
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
                  ? "border-slate-700 bg-slate-950 text-white hover:bg-slate-800"
                  : "pointer-events-none border-slate-800 bg-slate-900 text-slate-600"
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
