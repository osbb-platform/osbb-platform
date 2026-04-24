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
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all" as const, label: "Все" },
            { key: "cms" as const, label: "CMS" },
            { key: "incoming" as const, label: "БУДИНКИ" },
          ].map((item) => {
            const isActive = tab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => switchTab(item.key)}
                className={`inline-flex items-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "border-[var(--cms-accent-primary)] bg-[var(--cms-accent-primary)] text-[var(--cms-accent-foreground)]"
                    : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-tertiary)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "cms" ? (
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 backdrop-blur">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--cms-text-secondary)]">
              Фільтри журналу дій
            </div>

            <button
              type="button"
              onClick={resetCurrentTab}
              className="text-sm text-[var(--cms-text-secondary)] underline decoration-[var(--cms-border-secondary)] underline-offset-4 transition hover:text-[var(--cms-text-primary)]"
            >
              Скинути
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Співробітник
              </label>
              <select
                value={actor}
                onChange={(event) =>
                  updateParams({
                    actor: event.target.value || null,
                  })
                }
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="">Усі співробітники</option>
                {cmsActors.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Розділ CMS
              </label>
              <select
                value={mainSection}
                onChange={(event) =>
                  updateParams({
                    mainSection: event.target.value || null,
                    subSection: null,
                  })
                }
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="">Усі розділи</option>
                {cmsSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Підрозділ
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
                    ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] focus:border-[var(--cms-border-secondary)]"
                    : "cursor-not-allowed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
                }`}
              >
                <option value="">Усі підрозділи</option>
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Період
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Сортування
              </label>
              <select
                value={sort}
                onChange={(event) =>
                  updateParams({
                    sort: event.target.value,
                  })
                }
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="date_desc">Спочатку нові</option>
                <option value="date_asc">Спочатку старі</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "incoming" ? (
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 backdrop-blur">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="text-xs font-medium uppercase tracking-wide text-[var(--cms-text-secondary)]">
              Фільтри вхідних подій
            </div>

            <button
              type="button"
              onClick={resetCurrentTab}
              className="text-sm text-[var(--cms-text-secondary)] underline decoration-[var(--cms-border-secondary)] underline-offset-4 transition hover:text-[var(--cms-text-primary)]"
            >
              Скинути
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
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
                className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-2.5 text-[var(--cms-text-primary)] outline-none transition focus:border-[var(--cms-border-secondary)]"
              >
                <option value="">Оберіть район</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Будинок
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
                    ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] focus:border-[var(--cms-border-secondary)]"
                    : "cursor-not-allowed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
                }`}
              >
                <option value="">Усі будинки району</option>
                {housesForSelectedDistrict.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Розділ сайту
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
                    ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] focus:border-[var(--cms-border-secondary)]"
                    : "cursor-not-allowed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
                }`}
              >
                <option value="">Усі розділи</option>
                {incomingSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Період
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--cms-text-primary)]">
                Сортування
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
                    ? "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] focus:border-[var(--cms-border-secondary)]"
                    : "cursor-not-allowed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
                }`}
              >
                <option value="date_desc">Спочатку нові</option>
                <option value="date_asc">Спочатку старі</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
