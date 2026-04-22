"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateHouseForm } from "@/src/modules/houses/components/CreateHouseForm";
import { EditHouseForm } from "@/src/modules/houses/components/EditHouseForm";
import { HouseRegistryCard } from "@/src/modules/houses/components/HouseRegistryCard";
import { archiveHouse, type ArchiveHouseState } from "@/src/modules/houses/actions/archiveHouse";
import { restoreHouse, type RestoreHouseState } from "@/src/modules/houses/actions/restoreHouse";
import { deleteArchivedHouse, type DeleteArchivedHouseState } from "@/src/modules/houses/actions/deleteArchivedHouse";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type HouseItem = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  cover_image_url?: string | null;
  tariff_amount: number | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  district: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  } | null;
  unread_messages_count: number;
  message_items: Array<{
    id: string;
    created_at: string;
    category: string;
    specialist_label: string;
    requester_name: string;
    requester_email: string;
    requester_phone: string | null;
    apartment: string;
    subject: string | null;
    comment: string | null;
    status: string;
  }>;
};

type HousesRegistryWorkspaceProps = {
  houses: HouseItem[];
  districts: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  currentUser: CurrentAdminUser;
};

const initialArchiveState: ArchiveHouseState = {
  error: null,
  successMessage: null,
};

const initialRestoreState: RestoreHouseState = {
  error: null,
  successMessage: null,
};

const initialDeleteArchivedHouseState: DeleteArchivedHouseState = {
  error: null,
  successMessage: null,
};

function formatArchivedAt(value: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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

function HouseEditorCard({
  house,
  districts,
  onClose,
}: {
  house: HouseItem;
  districts: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const archiveFormRef = useRef<HTMLFormElement | null>(null);
  const isArchiveConfirmedRef = useRef(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [archiveState, archiveAction, isArchivePending] = useActionState(
    archiveHouse,
    initialArchiveState,
  );

  useEffect(() => {
    cardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    if (archiveState.successMessage) {
      startTransition(() => {
        router.refresh();
        onClose();
      });
    }
  }, [archiveState.successMessage, onClose, router]);

  function handleArchiveSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isArchiveConfirmedRef.current) {
      isArchiveConfirmedRef.current = false;
      return;
    }

    event.preventDefault();
    setIsArchiveConfirmOpen(true);
  }

  function handleConfirmArchive() {
    isArchiveConfirmedRef.current = true;
    setIsArchiveConfirmOpen(false);
    archiveFormRef.current?.requestSubmit();
  }

  return (
    <div
      ref={cardRef}
      className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
            Настройки дома
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">
            {house.name}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            Изменение параметров дома и привязки к району.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAnnouncementOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-lg text-white transition hover:bg-slate-800"
            title="Объявление для жителей"
          >
            🧾
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-lg text-white transition hover:bg-slate-800"
            aria-label="Закрыть настройки дома"
          >
          ×
        </button>
      </div>
    </div>

      <EditHouseForm house={house} districts={districts} onSuccess={onClose} formId={`edit-house-${house.id}`} onPendingChange={setIsSavePending} />

      {archiveState.error ? (
        <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {archiveState.error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="submit"
          form={`edit-house-${house.id}`}
          disabled={isSavePending}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {isSavePending ? "Сохраняем..." : "Сохранить данные дома"}
        </button>

        <form ref={archiveFormRef} action={archiveAction} onSubmit={handleArchiveSubmit}>
          <input type="hidden" name="id" value={house.id} />
          <button
            type="submit"
            disabled={isArchivePending}
            className="inline-flex items-center justify-center rounded-2xl border border-red-800 bg-red-950/40 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
          >
            {isArchivePending ? "Архивируем..." : "Архивировать дом"}
          </button>
        </form>
      </div>
      <PlatformConfirmModal
        open={isArchiveConfirmOpen}
        tone="warning"
        title="Архивировать дом?"
        description={`После подтверждения дом «${house.name}» исчезнет из активного списка CMS, а публичный сайт дома перестанет работать. Все данные, разделы и история сохранятся и смогут быть восстановлены позже.`}
        confirmLabel="Переместить в архив"
        pendingLabel="Архивируем..."
        isPending={isArchivePending}
        onCancel={() => setIsArchiveConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
      />

      {isAnnouncementOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="relative h-[85vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="text-sm font-medium text-slate-900">
                Объявление для жителей
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/reports/view?path=${encodeURIComponent(`${house.id}/announcement.pdf`)}&bucket=house-announcements&download=1&filename=${encodeURIComponent(`${house.slug}.pdf`)}`}
                  download={`${house.slug}.pdf`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Скачать PDF
                </a>

                <button
                  type="button"
                  onClick={() => setIsAnnouncementOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-700 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </div>

            <iframe
              src={`/api/reports/view?path=${encodeURIComponent(`${house.id}/announcement.pdf`)}&bucket=house-announcements`}
              className="h-[calc(85vh-73px)] w-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ArchivedHouseRestoreCard({
  house,
  canRestore,
  canDelete,
}: {
  house: HouseItem;
  canRestore: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const restoreFormRef = useRef<HTMLFormElement | null>(null);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const isRestoreConfirmedRef = useRef(false);
  const isDeleteConfirmedRef = useRef(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    restoreHouse,
    initialRestoreState,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteArchivedHouse,
    initialDeleteArchivedHouseState,
  );

  useEffect(() => {
    if (state.successMessage || deleteState.successMessage) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [deleteState.successMessage, router, state.successMessage]);

  function handleRestoreSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isRestoreConfirmedRef.current) {
      isRestoreConfirmedRef.current = false;
      return;
    }

    event.preventDefault();
    setIsRestoreConfirmOpen(true);
  }

  function handleConfirmRestore() {
    isRestoreConfirmedRef.current = true;
    setIsRestoreConfirmOpen(false);
    restoreFormRef.current?.requestSubmit();
  }

  function handleDeleteSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isDeleteConfirmedRef.current) {
      isDeleteConfirmedRef.current = false;
      return;
    }

    event.preventDefault();
    setIsDeleteConfirmOpen(true);
  }

  function handleConfirmDelete() {
    isDeleteConfirmedRef.current = true;
    setIsDeleteConfirmOpen(false);
    deleteFormRef.current?.requestSubmit();
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-[0_12px_32px_rgba(2,6,23,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <h3 className="min-w-0 text-xl font-semibold text-white">
              {house.name}
            </h3>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                slug: {house.slug}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Архив
              </span>

              {house.district ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: house.district.theme_color }}
                >
                  {house.district.name}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 text-sm text-slate-400">{house.address}</div>
          <div className="mt-1 text-sm text-slate-500">
            ОСББ: {house.osbb_name ?? "не указано"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 text-slate-500"
            aria-label="Настройки недоступны для архивного дома"
            title="Архивный дом"
            disabled
          >
            <SettingsIcon />
          </button>

          <Link
            href={`https://${house.slug}.osbb-platform.com.ua`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-white transition hover:bg-slate-800"
            aria-label={`Открыть сайт дома ${house.name}`}
            title="Открыть сайт дома"
          >
            <EyeIcon />
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {canRestore ? <form ref={restoreFormRef} action={formAction} onSubmit={handleRestoreSubmit}>
            <input type="hidden" name="id" value={house.id} />
            <button
              type="submit"
              disabled={isPending || isDeletePending}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
            >
              {isPending ? "Восстанавливаем..." : "Восстановить"}
            </button>
          </form> : null}

          {canDelete ? <form ref={deleteFormRef} action={deleteAction} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="id" value={house.id} />
            <button
              type="submit"
              disabled={isPending || isDeletePending}
              className="inline-flex items-center justify-center rounded-2xl border border-red-800 bg-red-950/40 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-60"
            >
              {isDeletePending ? "Удаляем..." : "Удалить"}
            </button>
          </form> : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span>Создан: {formatCreatedAt(house.created_at)}</span>
          <span>Архивирован: {formatArchivedAt(house.archived_at)}</span>
        </div>
      </div>

      {state.error ? (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {deleteState.error ? (
        <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {deleteState.error}
        </div>
      ) : null}

      {state.successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {state.successMessage}
        </div>
      ) : null}

      {deleteState.successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {deleteState.successMessage}
        </div>
      ) : null}

      <PlatformConfirmModal
        open={isRestoreConfirmOpen}
        tone="neutral"
        title="Восстановить дом?"
        description={`После подтверждения дом «${house.name}» вернется в активный список CMS со всеми сохраненными разделами и настройками.`}
        confirmLabel="Восстановить дом"
        pendingLabel="Восстанавливаем..."
        isPending={isPending}
        onCancel={() => setIsRestoreConfirmOpen(false)}
        onConfirm={handleConfirmRestore}
      />

      <PlatformConfirmModal
        open={isDeleteConfirmOpen}
        tone="destructive"
        title="Удалить дом навсегда?"
        description={`После подтверждения дом «${house.name}», его разделы, материалы и связанные записи будут окончательно удалены из системы без возможности восстановления. Это действие нельзя отменить.`}
        confirmLabel="Удалить дом"
        pendingLabel="Удаляем..."
        isPending={isDeletePending}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
          

</div>
  );
}

export function HousesRegistryWorkspace({
  houses,
  districts,
  currentUser,
}: HousesRegistryWorkspaceProps) {
  const access = getResolvedAccess(currentUser.role);
  const canManageRegistry = access.housesRegistry.create || access.housesRegistry.edit;
  const canArchive = access.housesRegistry.archive;
  const canRestore = access.housesRegistry.restore;
  const canDelete = access.housesRegistry.delete;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [editingHouse, setEditingHouse] = useState<HouseItem | null>(null);

  const activeHouses = useMemo(
    () => houses.filter((house) => !house.archived_at),
    [houses],
  );

  const archivedHouses = useMemo(
    () => houses.filter((house) => Boolean(house.archived_at)),
    [houses],
  );

  const [createOpenBaseline, setCreateOpenBaseline] = useState<number | null>(null);
  const shouldRenderCreate =
    canManageRegistry &&
    isCreateOpen &&
    (createOpenBaseline === null || activeHouses.length <= createOpenBaseline);

  const filteredHouses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return activeHouses.filter((house) => {
      const matchesDistrict = districtFilter
        ? house.district?.id === districtFilter
        : true;

      const matchesSearch = normalizedQuery
        ? [
            house.name,
            house.address,
            house.slug,
            house.osbb_name ?? "",
            house.short_description ?? "",
            house.public_description ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;

      return matchesDistrict && matchesSearch;
    });
  }, [activeHouses, searchQuery, districtFilter]);

  function openSettings(house: HouseItem) {
    if (!access.housesRegistry.edit) return;
      setEditingHouse(house);
  }

  function closeSettings() {
    setEditingHouse(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Управление домами
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
              Рабочий реестр всех домов платформы: быстрый переход к разделам дома,
              настройкам, публичному сайту и управлению архивом.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Активных: {activeHouses.length}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                В архиве: {archivedHouses.length}
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Всего: {houses.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <button
              type="button"
              onClick={() => {
                  if (shouldRenderCreate) {
                    setIsCreateOpen(false);
                    setCreateOpenBaseline(null);
                    return;
                  }

                  setCreateOpenBaseline(activeHouses.length);
                  setIsCreateOpen(true);
                }}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Создать дом
            </button>

            <button
              type="button"
              onClick={() => setIsArchiveOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Архив домов
            </button>
          </div>
        </div>
      </div>

      {shouldRenderCreate ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Новый дом</h2>
              <p className="mt-2 text-sm text-slate-400">
                Создание нового объекта для operational workflow.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
            >
              ×
            </button>
          </div>

          <CreateHouseForm districts={districts} />
        </div>
      ) : null}

      {editingHouse && canArchive ? (
        <HouseEditorCard
          house={editingHouse}
          districts={districts}
          onClose={closeSettings}
        />
      ) : null}

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Поиск по реестру
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Быстрый поиск дома по названию, адресу, slug или ОСББ.
            </p>
          </div>

          <div className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
            Найдено: {filteredHouses.length}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Поиск
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Введите дом, улицу, slug или название ОСББ"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Район
            </label>
            <select
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
            >
              <option value="">Все районы</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredHouses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-400">
            По текущим фильтрам дома не найдены.
          </div>
        ) : (
          filteredHouses.map((house) => (
            <HouseRegistryCard
              key={house.id}
              house={house}
              currentUser={currentUser}
              onOpenSettings={openSettings}
            />
          ))
        )}
      </div>

      {isArchiveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setIsArchiveOpen(false)}
            aria-label="Закрыть архив домов"
          />

          <div className="relative z-10 flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-6">
              <div>
                <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Архив домов
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Архивированные дома
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Здесь находятся дома, которые скрыты из активного реестра. Их можно восстановить в полном объеме.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsArchiveOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-lg text-white transition hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {archivedHouses.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-400">
                  В архиве пока нет домов.
                </div>
              ) : (
                <div className="space-y-4">
                  {archivedHouses.map((house) => (
                    <ArchivedHouseRestoreCard
                      key={house.id}
                      house={house}
                      canRestore={canRestore}
                      canDelete={canDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
          

</div>
  );
}
