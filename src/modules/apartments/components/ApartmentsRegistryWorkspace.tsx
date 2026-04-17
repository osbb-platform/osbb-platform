"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApartmentsImportPanel } from "@/src/modules/apartments/components/ApartmentsImportPanel";
import { ApartmentsMiniBulkPanel } from "@/src/modules/apartments/components/ApartmentsMiniBulkPanel";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import {
  archiveApartment,
  type ArchiveApartmentState,
} from "@/src/modules/apartments/actions/archiveApartment";
import {
  archiveAllHouseApartments,
  type ArchiveAllHouseApartmentsState,
} from "@/src/modules/apartments/actions/archiveAllHouseApartments";
import {
  downloadApartmentsImportTemplate,
  exportApartmentsRegistry,
} from "@/src/modules/apartments/utils/apartmentsSpreadsheet";
import type {
  AdminHouseApartmentListItem,
  AdminHouseApartmentsSummary,
} from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type DistrictOption = {
  id: string;
  name: string;
};

type HouseOption = {
  id: string;
  name: string;
  districtId: string;
};

type ApartmentsRegistryWorkspaceProps = {
  currentUserRole?: "superadmin" | "admin" | "manager" | null;
  districts: DistrictOption[];
  houses: HouseOption[];
  selectedDistrictId: string;
  selectedHouseId: string;
  archived: boolean;
  items: AdminHouseApartmentListItem[];
  summary: AdminHouseApartmentsSummary | null;
};

type SortKey =
  | "id"
  | "apartment_label"
  | "account_number"
  | "owner_name"
  | "area"
  | "source_type"
  | "created_at";

type SortDirection = "asc" | "desc";
type SourceFilter = "all" | "import" | "manual";

const initialArchiveState: ArchiveApartmentState = {
  error: null,
  success: null,
};

const initialArchiveAllState: ArchiveAllHouseApartmentsState = {
  error: null,
  success: null,
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatArea(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function getSourceLabel(sourceType: "import" | "manual") {
  return sourceType === "import" ? "Импорт" : "Вручную";
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "ru", { sensitivity: "base", numeric: true });
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onToggle,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDirection: SortDirection;
  onToggle: (key: SortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const arrow = isActive ? (sortDirection === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={
        isActive
          ? "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white"
          : "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 transition hover:text-white"
      }
    >
      <span>{label}</span>
      <span className="text-[10px]">{arrow}</span>
    </button>
  );
}

export function ApartmentsRegistryWorkspace({
  currentUserRole,
  districts,
  houses,
  selectedDistrictId,
  selectedHouseId,
  archived,
  items,
  summary,
}: ApartmentsRegistryWorkspaceProps) {
  const access = getResolvedAccess(currentUserRole);
  const canMutateRegistry = access.apartmentsRegistry.createManual || access.apartmentsRegistry.importReplace;
  const canExport = access.apartmentsRegistry.export;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [isMiniBulkOpen, setIsMiniBulkOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [confirmAction, setConfirmAction] = useState<
    | { type: "single"; apartmentId: string; houseId: string }
    | { type: "bulk"; houseId: string }
    | null
  >(null);

  const [archiveState, archiveFormAction] = useActionState(
    archiveApartment,
    initialArchiveState,
  );

  const [archiveAllState, archiveAllFormAction] = useActionState(
    archiveAllHouseApartments,
    initialArchiveAllState,
  );

  useEffect(() => {
    if (archiveState.success || archiveAllState.success) {
      router.refresh();
    }
  }, [archiveAllState.success, archiveState.success, router]);

  const districtHouses = useMemo(
    () => houses.filter((house) => house.districtId === selectedDistrictId),
    [houses, selectedDistrictId],
  );

  const selectedHouse = useMemo(
    () => districtHouses.find((house) => house.id === selectedHouseId) ?? null,
    [districtHouses, selectedHouseId],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesGlobal = normalizedQuery
        ? [item.apartment_label, item.account_number, item.owner_name]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      const matchesSource =
        sourceFilter === "all" ? true : item.source_type === sourceFilter;

      return matchesGlobal && matchesSource;
    });
  }, [items, searchQuery, sourceFilter]);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];

    result.sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "id":
          comparison = compareText(a.id, b.id);
          break;
        case "apartment_label":
          comparison = compareText(a.apartment_label, b.apartment_label);
          break;
        case "account_number":
          comparison = compareText(a.account_number, b.account_number);
          break;
        case "owner_name":
          comparison = compareText(a.owner_name, b.owner_name);
          break;
        case "area": {
          const areaA = a.area ?? Number.NEGATIVE_INFINITY;
          const areaB = b.area ?? Number.NEGATIVE_INFINITY;
          comparison = areaA === areaB ? 0 : areaA > areaB ? 1 : -1;
          break;
        }
        case "source_type":
          comparison = compareText(
            getSourceLabel(a.source_type),
            getSourceLabel(b.source_type),
          );
          break;
        case "created_at": {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          comparison = timeA === timeB ? 0 : timeA > timeB ? 1 : -1;
          break;
        }
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [filteredItems, sortDirection, sortKey]);

  function updateParams(next: {
    districtId?: string;
    houseId?: string;
    archived?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.districtId !== undefined) {
      if (next.districtId) {
        params.set("districtId", next.districtId);
      } else {
        params.delete("districtId");
      }
    }

    if (next.houseId !== undefined) {
      if (next.houseId) {
        params.set("houseId", next.houseId);
      } else {
        params.delete("houseId");
      }
    }

    if (next.archived !== undefined) {
      if (next.archived) {
        params.set("archived", "1");
      } else {
        params.delete("archived");
      }
    }

    const query = params.toString();
    router.push(query ? `/admin/apartments?${query}` : "/admin/apartments");
  }

  function handleDistrictChange(nextDistrictId: string) {
    const nextDistrictHouses = houses.filter(
      (house) => house.districtId === nextDistrictId,
    );
    const nextHouseId = nextDistrictHouses[0]?.id ?? "";

    updateParams({
      districtId: nextDistrictId,
      houseId: nextHouseId,
      archived: false,
    });
  }

  function handleHouseChange(nextHouseId: string) {
    updateParams({
      districtId: selectedDistrictId,
      houseId: nextHouseId,
      archived: false,
    });
  }

  function handleArchiveApartment(apartmentId: string, houseId: string) {
    setConfirmAction({
      type: "single",
      apartmentId,
      houseId,
    });
  }

  function handleArchiveAll() {
    if (!selectedHouseId) return;

    setConfirmAction({
      type: "bulk",
      houseId: selectedHouseId,
    });
  }

  function handleConfirmArchive() {
    if (!confirmAction) return;

    if (confirmAction.type === "single") {
      const formData = new FormData();
      formData.set("apartmentId", confirmAction.apartmentId);
      formData.set("houseId", confirmAction.houseId);
      archiveFormAction(formData);
    } else {
      const formData = new FormData();
      formData.set("houseId", confirmAction.houseId);
      archiveAllFormAction(formData);
    }

    setConfirmAction(null);
  }

  function handleDownloadTemplate() {
    downloadApartmentsImportTemplate();
  }

  function handleExportRegistry() {
    if (!selectedHouse) return;

    exportApartmentsRegistry({
      houseName: selectedHouse.name,
      items,
    });
  }

  function handleSortToggle(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  function resetFilters() {
    setSearchQuery("");
    setSourceFilter("all");
  }

  return (
    <div className="space-y-6">
      {archiveState.error || archiveAllState.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {archiveState.error ?? archiveAllState.error}
        </div>
      ) : null}

      {archiveState.success || archiveAllState.success ? (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          {archiveState.success ?? archiveAllState.success}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Реестр квартир
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
                Управление квартирами, помещениями и другими объектами недвижимости внутри выбранного дома.
              </p>
            </div>

            {canMutateRegistry || canExport ? (
              <div className="flex flex-wrap gap-3 xl:justify-end">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Загрузить
                </button>

                <button
                  type="button"
                  onClick={handleExportRegistry}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Выгрузить
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Скачать шаблон
                </button>

                <button
                  type="button"
                  onClick={() => setIsMiniBulkOpen(true)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Добавить
                </button>

                {!archived ? (
                  <button
                    type="button"
                    onClick={handleArchiveAll}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-800 px-5 py-3 text-sm font-medium text-rose-300 transition hover:border-rose-600 hover:text-white"
                  >
                    Очистить список
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Район
              </label>
              <select
                value={selectedDistrictId}
                onChange={(event) => handleDistrictChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              >
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Дом
              </label>
              <select
                value={selectedHouseId}
                onChange={(event) => handleHouseChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              >
                {districtHouses.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedHouse ? (
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedHouse.name}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Сводка по текущему реестру квартир выбранного дома.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Активных: {summary?.activeCount ?? 0}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  В архиве: {summary?.archivedCount ?? 0}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Последний импорт: {formatDate(summary?.lastImportAt ?? null)}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Кто импортировал: {summary?.lastImportActorName ?? "—"}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Поиск
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Введите квартиру, лицевой счет или владельца"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Источник
            </label>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            >
              <option value="all">Все</option>
              <option value="import">Импорт</option>
              <option value="manual">Вручную</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Сбросить
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => updateParams({ archived: false })}
              className={
                !archived
                  ? "rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
                  : "rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
              }
            >
              Активные
            </button>

            <button
              type="button"
              onClick={() => updateParams({ archived: true })}
              className={
                archived
                  ? "rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
                  : "rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300"
              }
            >
              Архив
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-full bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200">
              Найдено: {filteredItems.length}
            </div>
            <div className="rounded-full bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200">
              Сортировка: {sortDirection === "asc" ? "↑" : "↓"}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-slate-400">
            {archived
              ? "В архиве выбранного дома по текущим фильтрам нет квартир."
              : "В активном реестре выбранного дома по текущим фильтрам нет квартир. Измените фильтры, используйте загрузку файла или ручное добавление."}
          </div>
        ) : (
          <>
            <div className="mt-4 text-sm text-slate-400">
              Сортировка:{" "}
              <span className="text-slate-200">
                {sortKey === "id" && "ID"}
                {sortKey === "apartment_label" && "Квартира"}
                {sortKey === "account_number" && "Лицевой счет"}
                {sortKey === "owner_name" && "Владелец"}
                {sortKey === "area" && "Квадраты"}
                {sortKey === "source_type" && "Источник"}
                {sortKey === "created_at" && "Дата создания"}
              </span>{" "}
              · {sortDirection === "asc" ? "по возрастанию" : "по убыванию"}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800">
              <div className="max-h-[72vh] overflow-auto">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-950/95">
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="ID"
                          sortKey="id"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Квартира"
                          sortKey="apartment_label"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Лицевой счет"
                          sortKey="account_number"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Владелец"
                          sortKey="owner_name"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Квадраты"
                          sortKey="area"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Источник"
                          sortKey="source_type"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3">
                        <SortableHeader
                          label="Дата создания"
                          sortKey="created_at"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onToggle={handleSortToggle}
                        />
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Комментарии
                      </th>
                      {!archived ? (
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Действие
                        </th>
                      ) : null}
                    </tr>
                  </thead>

                  <tbody>
                    {sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800 bg-slate-900/70"
                      >
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {item.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white">
                          {item.apartment_label}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {item.account_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {item.owner_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {formatArea(item.area)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {getSourceLabel(item.source_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          Пока не используется
                        </td>

                        {!archived ? (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedHouse) return;
                                handleArchiveApartment(item.id, selectedHouse.id);
                              }}
                              className="inline-flex items-center justify-center rounded-2xl border border-rose-800 px-3 py-2 text-sm font-medium text-rose-300 transition hover:border-rose-600 hover:text-white"
                            >
                              Архив
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {isMiniBulkOpen ? (
        <ApartmentsMiniBulkPanel
          houseId={selectedHouse!.id}
          houseName={selectedHouse!.name}
          onClose={() => setIsMiniBulkOpen(false)}
        />
      ) : null}

      {isImportOpen ? (
        <ApartmentsImportPanel
          houseId={selectedHouse!.id}
          houseName={selectedHouse!.name}
          onClose={() => setIsImportOpen(false)}
        />
      ) : null}
      <PlatformConfirmModal
        open={Boolean(confirmAction)}
        tone="warning"
        title={
          confirmAction?.type === "bulk"
            ? "Отправить весь список в архив?"
            : "Отправить квартиру в архив?"
        }
        description={
          confirmAction?.type === "bulk"
            ? "После подтверждения весь активный список квартир выбранного дома будет перемещен в архив CMS."
            : "После подтверждения квартира будет перемещена в архив CMS и исчезнет из активного реестра."
        }
        confirmLabel="Переместить в архив"
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
