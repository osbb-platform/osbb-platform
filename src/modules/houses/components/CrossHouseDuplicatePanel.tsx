"use client";

import { useMemo, useState } from "react";
import { houseSearchTextMatches, normalizeHouseSearchText } from "@/src/modules/houses/utils/houseSearch";
import { useRouter } from "next/navigation";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { AdminCommand } from "@/src/modules/content-engine/v2/types/commands";
import {
  buildDuplicatePublishCommand,
  readDuplicateCreatedItem,
  type DuplicateCreatedItem,
} from "@/src/modules/houses/components/crossHouseDuplicateFlow";
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

function formatTargetLabel(target: CrossHouseDuplicateTarget) {
  const districtName = (target.districtName ?? "").trim();
  const houseName = (target.name ?? "").trim();

  if (districtName && houseName) return `${districtName} — ${houseName}`;
  return districtName || houseName || "Будинок без назви";
}

function formatHouseCount(count: number) {
  return count === 1 ? "1 будинку" : `${count} будинках`;
}

type DuplicateFailure = {
  target: CrossHouseDuplicateTarget;
  phase: "duplicate" | "publish";
  message: string;
  createdItem?: DuplicateCreatedItem;
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
  const router = useRouter();
  const { dispatch, isPending } = useAdminContentCommand();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [failures, setFailures] = useState<DuplicateFailure[]>([]);
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
    const normalizedQuery = normalizeHouseSearchText(searchQuery);

    if (!normalizedQuery) {
      return availableTargets;
    }

    return availableTargets.filter((target) =>
      houseSearchTextMatches(
        [
          target.name,
          target.slug,
          target.address,
          target.districtName ?? "",
        ],
        normalizedQuery,
      ),
    );
  }, [availableTargets, searchQuery]);

  const selectedSet = useMemo(
    () => new Set(selectedTargetIds),
    [selectedTargetIds],
  );

  const selectedTargets = useMemo(() => {
    const targetById = new Map(
      availableTargets.map((target) => [target.id, target]),
    );

    return selectedTargetIds
      .map((targetId) => targetById.get(targetId))
      .filter((target): target is CrossHouseDuplicateTarget => Boolean(target));
  }, [availableTargets, selectedTargetIds]);

  const confirmDescription = useMemo(() => {
    const previewLimit = 8;
    const previewTargets = selectedTargets.slice(0, previewLimit);
    const previewList = previewTargets
      .map((target) => `• ${formatTargetLabel(target)}`)
      .join("\n");
    const hiddenTargetsCount = Math.max(
      selectedTargets.length - previewTargets.length,
      0,
    );
    const hiddenLine =
      hiddenTargetsCount > 0
        ? `• …ще ${formatHouseCount(hiddenTargetsCount)}`
        : "";
    const targetList = [previewList, hiddenLine].filter(Boolean).join("\n");

    return targetList
      ? `У кожному обраному будинку зʼявиться нова чернетка. Оригінал у поточному будинку не зміниться.\n\nОбрані будинки (${selectedTargets.length}):\n${targetList}`
      : "Оберіть хоча б один будинок для створення чернеток.";
  }, [selectedTargets]);

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
    setPublishImmediately(false);
    setProcessedCount(0);
    setPublishedCount(0);
    setFailures([]);
  }

  function closePanel() {
    resetPanelState();
    onCancel?.();
  }

  async function runSequentialJobs(
    jobs: Array<{ target: CrossHouseDuplicateTarget; createdItem?: DuplicateCreatedItem }>,
  ) {
    if (!jobs.length) return;

    setConfirmOpen(false);
    setIsProcessing(true);
    setProcessedCount(0);
    setPublishedCount(0);
    setFailures([]);

    const nextFailures: DuplicateFailure[] = [];
    let nextPublishedCount = 0;

    for (const job of jobs) {
      let createdItem = job.createdItem;
      let duplicateError = "";

      if (!createdItem) {
        const duplicateResult = await dispatch<unknown>(
          {
            type: commandType,
            houseId,
            payload: { sourceId, targetHouseIds: [job.target.id] },
          },
          {
            successMessage: null,
            refreshOnSuccess: false,
            onError: (error) => { duplicateError = error; },
          },
        );

        if (!duplicateResult) {
          nextFailures.push({ target: job.target, phase: "duplicate", message: duplicateError || "Не вдалося створити чернетку." });
          setProcessedCount((count) => count + 1);
          continue;
        }

        createdItem =
          readDuplicateCreatedItem(duplicateResult, job.target.id) ?? undefined;
        if (!createdItem) {
          nextFailures.push({ target: job.target, phase: "duplicate", message: "Команда дублювання не повернула id та lockVersion створеної чернетки." });
          setProcessedCount((count) => count + 1);
          continue;
        }
      }

      if (publishImmediately) {
        const publishCommand = buildDuplicatePublishCommand(commandType, createdItem);
        if (!publishCommand) {
          nextFailures.push({ target: job.target, phase: "publish", createdItem, message: "Для цього розділу не визначено безпечну команду публікації." });
          setProcessedCount((count) => count + 1);
          continue;
        }

        let publishError = "";
        const publishResult = await dispatch(publishCommand, {
          successMessage: null,
          refreshOnSuccess: false,
          enableUndo: false,
          onError: (error) => { publishError = error; },
        });

        if (!publishResult) {
          nextFailures.push({ target: job.target, phase: "publish", createdItem, message: publishError || "Чернетку створено, але не опубліковано." });
          setProcessedCount((count) => count + 1);
          continue;
        }

        nextPublishedCount += 1;
        setPublishedCount(nextPublishedCount);
      }

      setProcessedCount((count) => count + 1);
    }

    setFailures(nextFailures);
    setIsProcessing(false);
    router.refresh();

    if (!nextFailures.length) {
      resetPanelState();
      onSuccess?.();
    }
  }

  async function duplicateToSelectedHouses() {
    if (!selectedTargets.length) return;
    await runSequentialJobs(selectedTargets.map((target) => ({ target })));
  }

  async function retryFailures() {
    await runSequentialJobs(
      failures.map((failure) => ({
        target: failure.target,
        createdItem:
          failure.phase === "publish" ? failure.createdItem : undefined,
      })),
    );
  }

  if (!availableTargets.length) {
    return (
      <div className="rounded-[var(--r-xl)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-5 py-6 text-sm leading-6 text-[var(--cms-text-muted)]">
        Немає доступних активних будинків для створення копії. Поточний будинок
        виключається зі списку автоматично.
      </div>
    );
  }

  return (
    <div className="relative rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left shadow-[var(--cms-shadow-sm)]">
      <PlatformSectionLoader
        active={isPending || isProcessing}
        label={publishImmediately ? `Опубліковано ${publishedCount} з ${selectedTargets.length}` : `Створено ${processedCount} з ${selectedTargets.length}`}
        message="Будинки обробляються строго послідовно. Помилка одного будинку не зупиняє інші."
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
            disabled={!availableTargets.length || isPending || isProcessing || disabled}
            className="text-xs font-semibold text-[var(--cms-text)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            {allTargetsSelected ? "Зняти всі будинки" : "Усі будинки"}
          </button>

          <button
            type="button"
            onClick={toggleVisibleTargets}
            disabled={!visibleTargets.length || isPending || isProcessing || disabled}
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
              className="flex cursor-pointer items-start gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 transition hover:border-[var(--cms-border-strong)]"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(target.id)}
                onChange={() => toggleTarget(target.id)}
                disabled={isPending || isProcessing || disabled}
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
          <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] px-4 py-4 text-sm text-[var(--cms-text-muted)]">
            За цим пошуком будинків не знайдено.
          </div>
        )}
      </div>

      {visibleTargets.length > TARGETS_PAGE_SIZE ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
          <span>
            Показано {paginatedTargets.length} із {visibleTargets.length}.
            Сторінка {safeCurrentPage} з {totalPages}.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={isPending || isProcessing || disabled || safeCurrentPage <= 1}
              className="rounded-[var(--r-md)] border border-[var(--cms-border)] px-3 py-1 font-semibold text-[var(--cms-text)] disabled:opacity-50"
            >
              Назад
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={isPending || isProcessing || disabled || safeCurrentPage >= totalPages}
              className="rounded-[var(--r-md)] border border-[var(--cms-border)] px-3 py-1 font-semibold text-[var(--cms-text)] disabled:opacity-50"
            >
              Далі
            </button>
          </div>
        </div>
      ) : null}

      <label className="mt-4 flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm text-[var(--cms-text)]">
        <input
          type="checkbox"
          checked={publishImmediately}
          onChange={(event) => setPublishImmediately(event.target.checked)}
          disabled={isPending || isProcessing || disabled}
          className="h-4 w-4 rounded border-[var(--cms-border-strong)]"
        />
        <span>
          <span className="block font-semibold">Опублікувати одразу</span>
          <span className="mt-1 block text-xs text-[var(--cms-text-muted)]">
            Після створення кожна чернетка публікується окремою існуючою командою.
          </span>
        </span>
      </label>

      {failures.length > 0 ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
          <div className="text-sm font-semibold text-[var(--cms-text)]">
            Не виконано для будинків: {failures.length}
          </div>
          <ul className="mt-2 space-y-2 text-xs text-[var(--cms-text-muted)]">
            {failures.map((failure) => (
              <li key={`${failure.target.id}-${failure.phase}`}>
                <strong>{formatTargetLabel(failure.target)}</strong>{" — "}
                {failure.phase === "publish"
                  ? "чернетку створено, публікація не виконана"
                  : "чернетку не створено"}
                {failure.message ? `: ${failure.message}` : ""}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void retryFailures()}
            disabled={isPending || isProcessing || disabled}
            className={[adminSecondaryButtonClass, "mt-3"].join(" ")}
          >
            Повторити для будинків з помилками
          </button>
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
          disabled={isPending || isProcessing || disabled || selectedTargetIds.length === 0}
          className={[adminPrimaryButtonClass, "disabled:opacity-60"].join(" ")}
        >
          {publishImmediately ? "Створити й опублікувати" : "Створити чернетки"}
        </button>
      </div>

      <PlatformConfirmModal
        open={confirmOpen}
        title={publishImmediately ? `Створити й опублікувати у ${formatHouseCount(selectedTargets.length)}?` : `Створити копії у ${formatHouseCount(selectedTargets.length)}?`}
        description={confirmDescription}
        confirmLabel={publishImmediately ? "Створити й опублікувати" : "Створити чернетки"}
        tone="warning"
        isPending={isPending || isProcessing}
        pendingLabel="Створюємо..."
        onConfirm={() => void duplicateToSelectedHouses()}
        onCancel={() => {
          if (!isPending && !isProcessing) {
            setConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
