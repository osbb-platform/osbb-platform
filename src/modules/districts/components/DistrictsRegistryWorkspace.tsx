"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  createDistrict,
  type CreateDistrictState,
} from "@/src/modules/districts/actions/createDistrict";
import {
  updateDistrict,
  type UpdateDistrictState,
} from "@/src/modules/districts/actions/updateDistrict";
import {
  deleteDistrict,
  type DeleteDistrictState,
} from "@/src/modules/districts/actions/deleteDistrict";
import { slugify } from "@/src/shared/utils/slug/slugify";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";

type DistrictListItem = {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
  houses_count: number;
  is_system_default: boolean;
};

type Props = {
  districts: DistrictListItem[];
};

type DistrictEditorMode =
  | { type: "create" }
  | {
      type: "edit";
      district: DistrictListItem;
    }
  | null;

const initialCreateState: CreateDistrictState = {
  error: null,
  success: null,
};

const initialUpdateState: UpdateDistrictState = {
  error: null,
  success: null,
};

const initialDeleteState: DeleteDistrictState = {
  error: null,
  success: null,
};

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .98 1.7 1.7 0 0 1-3.24 0A1.7 1.7 0 0 0 9.76 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.98-1 1.7 1.7 0 0 1 0-3.24A1.7 1.7 0 0 0 4.6 9.76a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.98 1.7 1.7 0 0 1 3.24 0A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .41.16.8.46 1.09.29.29.68.46 1.09.46a1.7 1.7 0 0 1 0 3.24A1.7 1.7 0 0 0 19.4 15z" />
    </svg>
  );
}

function padHousesCount(value: number) {
  return String(value).padStart(2, "0");
}

function DistrictFormCard({
  mode,
  district,
  onCancel,
}: {
  mode: "create" | "edit";
  district?: DistrictListItem;
  onCancel: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState(district?.name ?? "");
  const [themeColor, setThemeColor] = useState(
    district?.theme_color ?? "#7C3AED",
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const isDeleteConfirmedRef = useRef(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [createState, createAction, isCreatePending] = useActionState(
    createDistrict,
    initialCreateState,
  );

  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateDistrict,
    initialUpdateState,
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteDistrict,
    initialDeleteState,
  );

  const state = mode === "create" ? createState : updateState;
  const formAction = mode === "create" ? createAction : updateAction;
  const isPending = mode === "create" ? isCreatePending : isUpdatePending;

  const slugPreview = useMemo(() => {
    const generated = slugify(name);
    return generated || "slug-budet-sozdan-avtomaticheski";
  }, [name]);

  useEffect(() => {
    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
  if (state.success || deleteState.success) {
    startTransition(() => {
      router.refresh();
      onCancel();
    });
  }
}, [deleteState.success, onCancel, router, state.success]);

  const canDelete = mode === "edit" && district && !district.is_system_default;

  function handleDeleteSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isDeleteConfirmedRef.current) {
      isDeleteConfirmedRef.current = false;
      return;
    }

    event.preventDefault();

    if (!district) {
      return;
    }

    setIsDeleteConfirmOpen(true);
  }

  function handleConfirmDelete() {
    isDeleteConfirmedRef.current = true;
    setIsDeleteConfirmOpen(false);
    deleteFormRef.current?.requestSubmit();
  }

  return (
    <div
      ref={formRef}
      className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {mode === "create" ? "Создать новый район" : "Настройки района"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "create"
              ? "Создай район, чтобы затем привязывать к нему дома, страницы и структуру CMS."
              : "Измените название и фирменный цвет района. Slug обновляется автоматически."}
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-lg text-slate-300 transition hover:border-slate-500 hover:text-white"
          aria-label="Закрыть форму"
        >
          ×
        </button>
      </div>

      <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
        {mode === "edit" && district ? (
          <input type="hidden" name="id" value={district.id} />
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Название района
          </label>
          <input
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Вознесеновский"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Системный slug
          </label>
          <input
            type="text"
            value={slugPreview}
            readOnly
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-400 outline-none"
          />
        </div>

        <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-white">Фирменный цвет района</div>
              <div className="mt-1 text-sm text-slate-400">
                Этот цвет используется в карточках, фильтрах и связанной навигации.
              </div>
            </div>

            <div
              className="h-12 w-12 rounded-2xl border border-slate-700"
              style={{ backgroundColor: themeColor }}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
            <div>
              <input
                type="color"
                value={themeColor}
                onChange={(event) =>
                  setThemeColor(event.target.value.toUpperCase())
                }
                className="h-12 w-full cursor-pointer rounded-2xl border border-slate-700 bg-slate-950 p-1"
                aria-label="Выбор цвета района"
              />
            </div>

            <div>
              <input
                name="themeColor"
                type="text"
                value={themeColor}
                onChange={(event) =>
                  setThemeColor(event.target.value.toUpperCase())
                }
                placeholder="#7C3AED"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        {state.error ? (
          <div className="md:col-span-2 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        ) : null}

        {deleteState.error ? (
          <div className="md:col-span-2 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {deleteState.error}
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
          >
            {isPending
              ? mode === "create"
                ? "Создаем..."
                : "Сохраняем..."
              : mode === "create"
                ? "Создать район"
                : "Сохранить"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Отмена
          </button>
        </div>
      </form>

      {canDelete ? (
        <div className="mt-8 flex justify-end">
          <form ref={deleteFormRef} action={deleteAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="id" value={district.id} />
            <button
              type="submit"
              disabled={isDeletePending}
              className="inline-flex items-center justify-center rounded-2xl border border-red-800 bg-red-950/40 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
            >
              {isDeletePending ? "Удаляем..." : "Удалить район"}
            </button>
          </form>
        </div>
      ) : null}
      <PlatformConfirmModal
        open={isDeleteConfirmOpen}
        tone="destructive"
        title="Удалить район?"
        description={
          district
            ? district.houses_count > 0
              ? `После подтверждения район «${district.name}» будет удален из CMS. Дома (${district.houses_count}) автоматически перейдут в «Без района».`
              : `После подтверждения район «${district.name}» будет удален из CMS.`
            : "После подтверждения район будет удален из CMS."
        }
        confirmLabel="Удалить район"
        pendingLabel="Удаляем..."
        isPending={isDeletePending}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export function DistrictsRegistryWorkspace({ districts }: Props) {
  const [editorMode, setEditorMode] = useState<DistrictEditorMode>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("name_asc");

  const visibleDistricts = districts.filter(
    (district) => !district.is_system_default || district.houses_count > 0,
  );

  const filteredDistricts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const result = visibleDistricts.filter((district) => {
      if (!normalizedQuery) return true;

      return [district.name, district.slug]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    result.sort((a, b) => {
      switch (sortMode) {
        case "houses_desc":
          return b.houses_count - a.houses_count || a.name.localeCompare(b.name, "uk");
        case "empty_first":
          return Number(a.houses_count > 0) - Number(b.houses_count > 0) || a.name.localeCompare(b.name, "uk");
        case "filled_first":
          return Number(b.houses_count > 0) - Number(a.houses_count > 0) || a.name.localeCompare(b.name, "uk");
        case "name_asc":
        default:
          return a.name.localeCompare(b.name, "uk");
      }
    });

    return result;
  }, [visibleDistricts, searchQuery, sortMode]);

  const totalHousesCount = visibleDistricts.reduce(
    (sum, district) => sum + district.houses_count,
    0,
  );

  function openCreateForm() {
    setEditorMode({ type: "create" });
  }

  function openEditForm(district: DistrictListItem) {
    setEditorMode({ type: "edit", district });
  }

  function closeEditor() {
    setEditorMode(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Управление районами
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
              Районы — базовая структура платформы. Сначала создается район, затем
              к нему привязываются дома и вся CMS-логика объекта.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Районов: {visibleDistricts.length}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Домов в системе: {totalHousesCount}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Создать район
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Поиск по районам</h2>
            <p className="mt-2 text-sm text-slate-400">
              Быстрый поиск района по названию или slug.
            </p>
          </div>

          <div className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
            Найдено: {filteredDistricts.length}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Поиск
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Например: Вознесеновский или voznesenovskyi"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Сортировка
            </label>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            >
              <option value="name_asc">По названию А–Я</option>
              <option value="houses_desc">По количеству домов</option>
              <option value="empty_first">Сначала пустые</option>
              <option value="filled_first">Сначала заполненные</option>
            </select>
          </div>
        </div>
      </div>

      {editorMode?.type === "create" ? (
        <DistrictFormCard mode="create" onCancel={closeEditor} />
      ) : null}

      {editorMode?.type === "edit" ? (
        <DistrictFormCard
          mode="edit"
          district={editorMode.district}
          onCancel={closeEditor}
        />
      ) : null}

      {filteredDistricts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-slate-300">
          <div className="text-xl font-semibold text-white">
            Пока нет ни одного района
          </div>
          <div className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Начни со структуры платформы: создай первый район, а затем добавляй в него дома.
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Создать первый район
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDistricts.map((district) => (
            <article
              key={district.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_12px_32px_rgba(2,6,23,0.28)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold text-white">
                    {district.name}
                  </div>
                  <div className="mt-2 truncate text-sm text-slate-400">
                    slug: {district.slug}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full border border-slate-700"
                    style={{ backgroundColor: district.theme_color }}
                    aria-label={`Цвет района ${district.theme_color}`}
                    title={district.theme_color}
                  />
                  {!district.is_system_default ? (
                    <button
                      type="button"
                      onClick={() => openEditForm(district)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-slate-200 transition hover:border-slate-500 hover:text-white"
                      aria-label={`Настроить район ${district.name}`}
                      title="Настроить район"
                    >
                      <SettingsIcon />
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-2xl border border-slate-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      Системный
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="text-3xl font-semibold tracking-tight text-white">
                  {padHousesCount(district.houses_count)}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  домов в районе
                </div>
                <div className="mt-3 text-xs font-medium text-slate-500">
                  {district.houses_count > 0 ? "Заполнен домами" : "Пока пустой"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
