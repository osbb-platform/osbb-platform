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
  createCity,
  type CreateCityState,
} from "@/src/modules/cities/actions/createCity";
import {
  updateCity,
  type UpdateCityState,
} from "@/src/modules/cities/actions/updateCity";
import {
  deleteCity,
  type DeleteCityState,
} from "@/src/modules/cities/actions/deleteCity";
import type { AdminCityListItem } from "@/src/modules/cities/services/getAdminCities";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { slugify } from "@/src/shared/utils/slug/slugify";
import {
  adminDangerButtonClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

type EditorMode =
  | { type: "create" }
  | { type: "edit"; city: AdminCityListItem }
  | null;

const initialCreateState: CreateCityState = { error: null, success: null };
const initialUpdateState: UpdateCityState = { error: null, success: null };
const initialDeleteState: DeleteCityState = { error: null, success: null };

function CityEditor({
  mode,
  city,
  onClose,
}: {
  mode: "create" | "edit";
  city?: AdminCityListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const deleteConfirmedRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(city?.name ?? "");
  const [isActive, setIsActive] = useState(city?.is_active ?? true);

  const [createState, createAction, createPending] = useActionState(
    createCity,
    initialCreateState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateCity,
    initialUpdateState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteCity,
    initialDeleteState,
  );

  const state = mode === "create" ? createState : updateState;
  const action = mode === "create" ? createAction : updateAction;
  const pending = mode === "create" ? createPending : updatePending;
  const slugPreview = useMemo(
    () => slugify(name) || "slug-bude-stvoreno-avtomatychno",
    [name],
  );

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (state.success || deleteState.success) {
      startTransition(() => {
        router.refresh();
        onClose();
      });
    }
  }, [deleteState.success, onClose, router, state.success]);

  function submitDelete(event: React.FormEvent<HTMLFormElement>) {
    if (deleteConfirmedRef.current) {
      deleteConfirmedRef.current = false;
      return;
    }
    event.preventDefault();
    setDeleteOpen(true);
  }

  function confirmDelete() {
    deleteConfirmedRef.current = true;
    setDeleteOpen(false);
    deleteFormRef.current?.requestSubmit();
  }

  return (
    <div ref={cardRef} className={`${adminSurfaceClass} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            {mode === "create" ? "Створити місто" : "Налаштування міста"}
          </h2>
          <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
            Місто визначає верхній рівень admin scope. Райони та будинки
            додаються окремо.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] text-lg text-[var(--cms-text-muted)]"
          aria-label="Закрити форму"
        >
          ×
        </button>
      </div>

      <form action={action} className="mt-6 grid gap-4 md:grid-cols-2">
        {mode === "edit" && city ? (
          <input type="hidden" name="id" value={city.id} />
        ) : null}

        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>Назва міста</label>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Наприклад, Київ"
            className={adminInputClass}
          />
        </div>

        <div>
          <label className={`mb-2 block ${adminTextLabelClass}`}>Системний slug</label>
          <input
            value={slugPreview}
            readOnly
            className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-[var(--cms-text-muted)] outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className={`mb-2 block ${adminTextLabelClass}`}>Статус</label>
          <select
            name="isActive"
            value={String(isActive)}
            onChange={(event) => setIsActive(event.target.value === "true")}
            className={adminInputClass}
          >
            <option value="true">Активне — доступне для робочого контексту</option>
            <option value="false">Неактивне — приховане з вибору міста</option>
          </select>
        </div>

        {state.error ? (
          <div className="md:col-span-2 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {state.error}
          </div>
        ) : null}

        {deleteState.error ? (
          <div className="md:col-span-2 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {deleteState.error}
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className={`${adminPrimaryButtonClass} disabled:opacity-60`}
          >
            {pending ? "Зберігаємо..." : mode === "create" ? "Створити місто" : "Зберегти"}
          </button>
          <button type="button" onClick={onClose} className={adminSecondaryButtonClass}>
            Скасувати
          </button>
        </div>
      </form>

      {mode === "edit" && city ? (
        <div className="mt-8 flex justify-end">
          <form ref={deleteFormRef} action={deleteAction} onSubmit={submitDelete}>
            <input type="hidden" name="id" value={city.id} />
            <button
              type="submit"
              disabled={deletePending}
              className={`${adminDangerButtonClass} disabled:opacity-60`}
            >
              {deletePending ? "Видаляємо..." : "Видалити місто"}
            </button>
          </form>
        </div>
      ) : null}

      <PlatformConfirmModal
        open={deleteOpen}
        tone="destructive"
        title="Видалити місто?"
        description={
          city
            ? `Місто «${city.name}» можна видалити тільки якщо в ньому немає районів і співробітників.`
            : "Після підтвердження місто буде видалено."
        }
        confirmLabel="Видалити місто"
        pendingLabel="Видаляємо..."
        isPending={deletePending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export function CitiesRegistryWorkspace({ cities }: { cities: AdminCityListItem[] }) {
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [search, setSearch] = useState("");

  const visibleCities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cities.filter((city) => {
      if (!query) return true;
      return `${city.name} ${city.slug}`.toLowerCase().includes(query);
    });
  }, [cities, search]);

  return (
    <div className="space-y-6">
      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--cms-text)]">
              Керування містами
            </h1>
            <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Міста створює та налаштовує тільки superadmin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditorMode({ type: "create" })}
            className={adminPrimaryButtonClass}
          >
            Створити місто
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-3 py-1 text-sm font-medium text-[var(--cms-pill-text)]">
            Міст: {cities.length}
          </span>
          <span className="rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-3 py-1 text-sm font-medium text-[var(--cms-pill-text)]">
            Активних: {cities.filter((city) => city.is_active).length}
          </span>
        </div>

        <div className="mt-6">
          <label className={`mb-2 block ${adminTextLabelClass}`}>Пошук</label>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Наприклад: Запоріжжя або zaporizhzhia"
            className={adminInputClass}
          />
        </div>
      </div>

      {editorMode?.type === "create" ? (
        <CityEditor mode="create" onClose={() => setEditorMode(null)} />
      ) : null}

      {editorMode?.type === "edit" ? (
        <CityEditor
          mode="edit"
          city={editorMode.city}
          onClose={() => setEditorMode(null)}
        />
      ) : null}

      {visibleCities.length === 0 ? (
        <div className="rounded-[var(--r-xl)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface)] p-8 text-[var(--cms-text-muted)]">
          Міста не знайдено.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCities.map((city) => (
            <article
              key={city.id}
              className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-[var(--cms-text)]">
                    {city.name}
                  </h2>
                  <div className="mt-2 truncate text-sm text-[var(--cms-text-muted)]">
                    slug: {city.slug}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorMode({ type: "edit", city })}
                  className="inline-flex h-10 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] px-3 text-sm text-[var(--cms-text)]"
                >
                  Налаштувати
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-pill-text)]">
                  {city.is_active ? "Активне" : "Неактивне"}
                </span>
                <span className="rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-pill-text)]">
                  Районів: {city.districts_count}
                </span>
                <span className="rounded-[var(--r-pill)] bg-[var(--cms-pill-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-pill-text)]">
                  Співробітників: {city.employees_count}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
