"use client";

import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
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

type CrossHouseDuplicatePanelProps = {
  houseId: string;
  sourceId: string;
  commandType: AdminCommand["type"];
  targets?: CrossHouseDuplicateTarget[];
  disabled?: boolean;
  onSuccess?: () => void;
};

export function CrossHouseDuplicatePanel({
  houseId,
  sourceId,
  commandType,
  targets = [],
  disabled = false,
  onSuccess,
}: CrossHouseDuplicatePanelProps) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  function toggleTarget(targetId: string) {
    setSelectedTargetIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
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

  function closePanel() {
    setIsOpen(false);
    setConfirmOpen(false);
    setSearchQuery("");
    setSelectedTargetIds([]);
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

    closePanel();
    onSuccess?.();
  }

  if (!availableTargets.length) {
    return null;
  }

  return (
    <div className="min-w-[280px] max-w-full">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => setIsOpen((current) => !current)}
        className={[adminSecondaryButtonClass, "disabled:opacity-60"].join(" ")}
      >
        Дублювати в інші будинки
      </button>

      {isOpen ? (
        <div className="relative mt-3 rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left shadow-sm">
          <PlatformSectionLoader
            active={isPending}
            label="Дублюємо матеріал у вибрані будинки…"
            message="Створюємо нові чернетки та оновлюємо історію для кожного будинку."
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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Пошук за назвою, адресою або slug"
              className={adminInputClass}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleVisibleTargets}
              disabled={!visibleTargets.length || isPending}
              className="text-xs font-semibold text-[var(--cms-text)] underline-offset-4 hover:underline disabled:opacity-50"
            >
              {visibleTargets.length > 0 &&
              visibleTargets.every((target) => selectedSet.has(target.id))
                ? "Зняти видимі"
                : "Обрати видимі"}
            </button>

            <div className="text-xs text-[var(--cms-text-muted)]">
              Обрано: {selectedTargetIds.length}
            </div>
          </div>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {visibleTargets.length > 0 ? (
              visibleTargets.map((target) => (
                <label
                  key={target.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 transition hover:border-[var(--cms-border-strong)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedSet.has(target.id)}
                    onChange={() => toggleTarget(target.id)}
                    disabled={isPending}
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
              disabled={isPending || selectedTargetIds.length === 0}
              className={[adminPrimaryButtonClass, "disabled:opacity-60"].join(" ")}
            >
              Створити чернетки
            </button>
          </div>
        </div>
      ) : null}

      <PlatformConfirmModal
        open={confirmOpen}
        title={`Дублювати матеріал у ${selectedTargetIds.length} будинків?`}
        description="У кожному вибраному будинку зʼявиться нова чернетка. Оригінал у поточному будинку не зміниться."
        confirmLabel="Створити чернетки"
        tone="warning"
        isPending={isPending}
        pendingLabel="Дублюємо..."
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
