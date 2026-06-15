"use client";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

export type CrossHouseDuplicateTarget = {
  id: string;
  name: string;
  slug: string;
  address: string;
  districtName: string | null;
  isActive: boolean;
  archivedAt: string | null;
};

const TARGETS_PAGE_SIZE = 25;

type CrossHouseDuplicatePanelProps = {
  houseId: string;
  sourceId: string;
  commandType: AdminCommand["type"];
  targets?: CrossHouseDuplicateTarget[];
  disabled?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function CrossHouseDuplicatePanel({
  houseId,
  sourceId,
  commandType,
  targets = [],
  disabled = false,
  onCancel,
  onSuccess,
}: CrossHouseDuplicatePanelProps) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);

  const availableTargets = useMemo(() => {
    return targets
      .filter((target) => target.id !== houseId)
      .filter((target) => target.isActive)
      .filter((target) => !target.archivedAt)
      .sort((left, right) => left.name.localeCompare(right.name, "uk"));
  }, [houseId, targets]);

  const visibleTargets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTargets;
    }

    return availableTargets.filter((target) =>
      [
        target.name,
        target.slug,
        target.address,
        target.districtName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [availableTargets, searchQuery]);

  const selectedSet = useMemo(
    () => new Set(selectedTargetIds),
    [selectedTargetIds],
  );

  const totalPages = Math.max(1, Math.ceil(visibleTargets.length / TARGETS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTargets = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * TARGETS_PAGE_SIZE;
    return visibleTargets.slice(startIndex, startIndex + TARGETS_PAGE_SIZE);
  }, [safeCurrentPage, visibleTargets]);

  const allTargetsSelected =
    availableTargets.length > 0 &&
    availableTargets.every((target) => selectedSet.has(target.id));

  function toggleTarget(targetId: string) {
    setSelectedTargetIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
  }

  function toggleAllTargets() {
    const allTargetIds = availableTargets.map((target) => target.id);

    if (allTargetsSelected) {
      setSelectedTargetIds([]);
      return;
    }

    setSelectedTargetIds(allTargetIds);
  }

  function toggleVisibleTargets() {
    const visibleIds = visibleTargets.map((target) => target.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

    if (allVisibleSelected) {
      setSelectedTargetIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    setSelectedTargetIds((current) =>
      Array.from(new Set([...current, ...visibleIds])),
    );
  }

  function updateSearchQuery(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function resetPanelState() {
    setConfirmOpen(false);
    setSearchQuery("");
    setCurrentPage(1);
    setSelectedTargetIds([]);
  }

  function closePanel() {
    resetPanelState();
    onCancel?.();
  }

  async function duplicateToSelectedHouses() {
    if (!selectedTargetIds.length) return;

    const result = await dispatch(
      {
        type: commandType,
        houseId,
        payload: {
          sourceId,
          targetHouseIds: selectedTargetIds,
        },
      },
      {
        successMessage:
          selectedTargetIds.length === 1
            ? "Чернетку створено в іншому будинку"
            : `Чернетки створено у ${selectedTargetIds.length} будинках`,
      },
    );

    if (!result) return;

    resetPanelState();
    onSuccess?.();
  }

  if (!availableTargets.length) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-5 py-6 text-sm leading-6 text-[var(--cms-text-muted)]">
        Немає доступних активних будинків для створення копії. Поточний будинок
        виключається зі списку автоматично.
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left shadow-sm">
      <PlatformSectionLoader
        active={isPending}
        label="Створюємо копії у вибраних будинках…"
        message="Формуємо нові чернетки та оновлюємо історію для кожного будинку."
        delayMs={0}
      />

      <div>
        <div className="text-sm font-semibold text-[var(--cms-text)]">
          Оберіть будинки
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--cms-text-muted)]">
          У вибраних будинках буде створено нову чернетку. Поточний будинок
          зі списку виключено.
        </p>
      </div>

      <div className="mt-4">
        <input
          value={searchQuery}
          onChange={(event) => updateSearchQuery(event.target.value)}
          placeholder="Пошук за назвою, адресою або slug"
          className={adminInputClass}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleAllTargets}
            disabled={!availableTargets.length || isPending || disabled}
            className="text-xs font-semibold text-[var(--cms-text)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            {allTargetsSelected ? "Зняти всі будинки" : "Усі будинки"}
          </button>

          <button
            type="button"
            onClick={toggleVisibleTargets}
            disabled={!visibleTargets.length || isPending || disabled}
            className="text-xs font-semibold text-[var(--cms-text)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            {visibleTargets.length > 0 &&
            visibleTargets.every((target) => selectedSet.has(target.id))
              ? "Зняти знайдені"
              : "Обрати знайдені"}
          </button>
        </div>

        <div className="text-xs text-[var(--cms-text-muted)]">
          Обрано: {selectedTargetIds.length} із {availableTargets.length}
        </div>
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {visibleTargets.length > 0 ? (
          paginatedTargets.map((target) => (
            <label
              key={target.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 transition hover:border-[var(--cms-border-strong)]"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(target.id)}
                onChange={() => toggleTarget(target.id)}
                disabled={isPending || disabled}
                className="mt-1 h-4 w-4 rounded border-[var(--cms-border-strong)]"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--cms-text)]">
                  {target.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--cms-text-muted)]">
                  {target.address}
                </span>
                <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--cms-text-soft)]">
                  <span>{target.slug}</span>
                  {target.districtName ? <span>· {target.districtName}</span> : null}
                </span>
              </span>
            </label>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--cms-border)] px-4 py-4 text-sm text-[var(--cms-text-muted)]">
            За цим пошуком будинків не знайдено.
          </div>
        )}
      </div>

      {visibleTargets.length > TARGETS_PAGE_SIZE ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
          <span>
            Показано {paginatedTargets.length} із {visibleTargets.length}.
            Сторінка {safeCurrentPage} з {totalPages}.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={isPending || disabled || safeCurrentPage <= 1}
              className="rounded-xl border border-[var(--cms-border)] px-3 py-1 font-semibold text-[var(--cms-text)] disabled:opacity-50"
            >
              Назад
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={isPending || disabled || safeCurrentPage >= totalPages}
              className="rounded-xl border border-[var(--cms-border)] px-3 py-1 font-semibold text-[var(--cms-text)] disabled:opacity-50"
            >
              Далі
            </button>
          </div>
        </div>
      ) : null}

      {lastError ? (
        <div className="mt-3 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {lastError}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={closePanel}
          disabled={isPending}
          className={adminSecondaryButtonClass}
        >
          Скасувати
        </button>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending || disabled || selectedTargetIds.length === 0}
          className={[adminPrimaryButtonClass, "disabled:opacity-60"].join(" ")}
        >
          Створити чернетки
        </button>
      </div>

      <PlatformConfirmModal
        open={confirmOpen}
        title={`Створити копії у ${selectedTargetIds.length} будинках?`}
        description="У кожному вибраному будинку зʼявиться нова чернетка. Оригінал у поточному будинку не зміниться."
        confirmLabel="Створити чернетки"
        tone="warning"
        isPending={isPending}
        pendingLabel="Створюємо..."
        onConfirm={() => void duplicateToSelectedHouses()}
        onCancel={() => {
          if (!isPending) {
            setConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
