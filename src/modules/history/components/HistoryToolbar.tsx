"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HistoryDateRangeFilter } from "@/src/modules/history/components/HistoryDateRangeFilter";
import type {
  PlatformHistoryTab,
  PlatformHistorySort,
} from "@/src/modules/history/services/getPlatformChangeHistory";

type CmsSectionOption = {
  key: string;
  label: string;
  subSections: ReadonlyArray<{ key: string; label: string }>;
};

type IncomingSectionOption = {
  key: string;
  label: string;
};

type DistrictOption = {
  id: string;
  name: string;
};

type HouseOption = {
  id: string;
  name: string;
  districtId: string | null;
};

type Props = {
  tab: PlatformHistoryTab;
  sort: PlatformHistorySort;
  actor: string;
  mainSection: string;
  subSection: string;
  districtId: string;
  houseId: string;
  dateFrom: string;
  dateTo: string;
  cmsActors: string[];
  cmsSections: ReadonlyArray<CmsSectionOption>;
  incomingSections: ReadonlyArray<IncomingSectionOption>;
  districts: DistrictOption[];
  houses: HouseOption[];
};

export function HistoryToolbar({
  tab,
  sort,
  actor,
  mainSection,
  subSection,
  districtId,
  houseId,
  dateFrom,
  dateTo,
  cmsActors,
  cmsSections,
  incomingSections,
  districts,
  houses,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedCmsSection =
    cmsSections.find((section) => section.key === mainSection) ?? null;

  const hasCmsSubSections =
    mainSection === "houses" &&
    (selectedCmsSection?.subSections?.length ?? 0) > 0;

  const incomingControlsEnabled = Boolean(districtId);

  const housesForSelectedDistrict = districtId
    ? houses.filter((house) => house.districtId === districtId)
    : [];

  function updateParams(
    patch: Record<string, string | null | undefined>,
    resetPage = true,
  ) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(patch).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    if (resetPage) {
      params.set("page", "1");
    }

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function switchTab(nextTab: PlatformHistoryTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    params.delete("page");

    if (nextTab !== "cms") {
      params.delete("actor");
      params.delete("mainSection");
    }

    if (nextTab !== "incoming") {
      params.delete("districtId");
      params.delete("houseId");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  function resetCurrentTab() {
    const params = new URLSearchParams();
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="sticky top-4 z-30 space-y-3">
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/95 p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all" as const, label: "Все" },
            { key: "cms" as const, label: "CMS" },
            { key: "incoming" as const, label: "ДОМА" },
          ].map((item) => {
            const isActive = tab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchTab(item.key)}
                className={`inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border-white bg-white text-slate-950"
                    : "border-slate-700 bg-slate-950/40 text-white hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "cms" ? (
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Фильтры журнала действий
            </div>

            <button
              type="button"
              onClick={resetCurrentTab}
              className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-white"
            >
              Сбросить
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Сотрудник
              </label>
              <select
                value={actor}
                onChange={(event) =>
                  updateParams({
                    actor: event.target.value || null,
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-slate-500"
              >
                <option value="">Все сотрудники</option>
                {cmsActors.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Раздел CMS
              </label>
              <select
                value={mainSection}
                onChange={(event) =>
                  updateParams({
                    mainSection: event.target.value || null,
                    subSection: null,
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-slate-500"
              >
                <option value="">Все разделы</option>
                {cmsSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Подраздел
              </label>
              <select
                value={subSection}
                disabled={!hasCmsSubSections}
                onChange={(event) =>
                  updateParams({
                    subSection: event.target.value || null,
                  })
                }
                className={`w-full rounded-2xl border px-4 py-2.5 outline-none transition ${
                  hasCmsSubSections
                    ? "border-slate-700 bg-slate-950 text-white focus:border-slate-500"
                    : "cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600"
                }`}
              >
                <option value="">Все подразделы</option>
                {(hasCmsSubSections
                  ? selectedCmsSection?.subSections ?? []
                  : []
                ).map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Период
              </label>
              <HistoryDateRangeFilter
                valueFrom={dateFrom}
                valueTo={dateTo}
                onChange={(nextFrom, nextTo) =>
                  updateParams({
                    dateFrom: nextFrom || null,
                    dateTo: nextTo || null,
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Сортировка
              </label>
              <select
                value={sort}
                onChange={(event) =>
                  updateParams({
                    sort: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-slate-500"
              >
                <option value="date_desc">Сначала новые</option>
                <option value="date_asc">Сначала старые</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "incoming" ? (
        <div className="rounded-3xl border border-slate-800/90 bg-slate-900/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Фильтры входящих событий
            </div>

            <button
              type="button"
              onClick={resetCurrentTab}
              className="text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 transition hover:text-white"
            >
              Сбросить
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Район
              </label>
              <select
                value={districtId}
                onChange={(event) =>
                  updateParams({
                    districtId: event.target.value || null,
                    houseId: null,
                    subSection: null,
                    dateFrom: null,
                    dateTo: null,
                  })
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition focus:border-slate-500"
              >
                <option value="">Выберите район</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Дом
              </label>
              <select
                value={houseId}
                disabled={!incomingControlsEnabled}
                onChange={(event) =>
                  updateParams({
                    houseId: event.target.value || null,
                  })
                }
                className={`w-full rounded-2xl border px-4 py-2.5 outline-none transition ${
                  incomingControlsEnabled
                    ? "border-slate-700 bg-slate-950 text-white focus:border-slate-500"
                    : "cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600"
                }`}
              >
                <option value="">Все дома района</option>
                {housesForSelectedDistrict.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Раздел сайта
              </label>
              <select
                value={subSection}
                disabled={!incomingControlsEnabled}
                onChange={(event) =>
                  updateParams({
                    subSection: event.target.value || null,
                  })
                }
                className={`w-full rounded-2xl border px-4 py-2.5 outline-none transition ${
                  incomingControlsEnabled
                    ? "border-slate-700 bg-slate-950 text-white focus:border-slate-500"
                    : "cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600"
                }`}
              >
                <option value="">Все разделы</option>
                {incomingSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Период
              </label>
              <HistoryDateRangeFilter
                valueFrom={dateFrom}
                valueTo={dateTo}
                disabled={!incomingControlsEnabled}
                onChange={(nextFrom, nextTo) =>
                  updateParams({
                    dateFrom: nextFrom || null,
                    dateTo: nextTo || null,
                  })
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-200">
                Сортировка
              </label>
              <select
                value={sort}
                disabled={!incomingControlsEnabled}
                onChange={(event) =>
                  updateParams({
                    sort: event.target.value,
                  })
                }
                className={`w-full rounded-2xl border px-4 py-2.5 outline-none transition ${
                  incomingControlsEnabled
                    ? "border-slate-700 bg-slate-950 text-white focus:border-slate-500"
                    : "cursor-not-allowed border-slate-800 bg-slate-950/40 text-slate-600"
                }`}
              >
                <option value="date_desc">Сначала новые</option>
                <option value="date_asc">Сначала старые</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
