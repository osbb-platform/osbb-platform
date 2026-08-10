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
  confirmDebtors1cImportPeriod,
  discardDebtors1cImportBuffer,
  parseDebtors1cImportBuffer,
  transferDebtors1cImportBuffer,
} from "@/src/modules/import-buffer/actions/debtors1cImportBufferActions";
import {
  INITIAL_DEBTORS_1C_IMPORT_STATE,
  type Debtors1cImportState,
} from "@/src/modules/import-buffer/debtors1cImportState";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { AdminStatusBadge } from "@/src/shared/ui/admin/AdminStatusBadge";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type Props = {
  houseId: string;
  isOpen: boolean;
  onClose: () => void;
};

const MONTHS = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

export function HouseDebtors1cImportPanel({ houseId, isOpen, onClose }: Props) {
  const router = useRouter();
  const [serverState, parseAction, isParsePending] = useActionState(
    parseDebtors1cImportBuffer,
    INITIAL_DEBTORS_1C_IMPORT_STATE,
  );
  const [state, setState] = useState<Debtors1cImportState>(
    INITIAL_DEBTORS_1C_IMPORT_STATE,
  );
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commandInFlightRef = useRef(false);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    setState(serverState);

    if (serverState.ok && serverState.detectedPeriod) {
      setPeriodYear(serverState.detectedPeriod.year);
      setPeriodMonth(serverState.detectedPeriod.month);
    }
  }, [serverState]);

  const matchedCount = useMemo(
    () =>
      state.ok
        ? state.rows.filter((row) => row.matchStatus === "matched").length
        : 0,
    [state],
  );

  const unmatchedRows = useMemo(
    () =>
      state.ok
        ? state.rows.filter((row) => row.matchStatus === "unmatched")
        : [],
    [state],
  );

  const unmatchedSourceDebtTotal = useMemo(
    () =>
      unmatchedRows.reduce(
        (total, row) => total + (row.debtValue ?? 0),
        0,
      ),
    [unmatchedRows],
  );

  const amountTotals = useMemo(() => {
    if (!state.ok) {
      return {
        sourceDebt: 0,
        systemBalance: 0,
      };
    }

    return state.rows.reduce(
      (totals, row) => ({
        sourceDebt: totals.sourceDebt + (row.debtValue ?? 0),
        systemBalance: totals.systemBalance + (row.osbbBalance ?? 0),
      }),
      {
        sourceDebt: 0,
        systemBalance: 0,
      },
    );
  }, [state]);

  const hasDiscardableBuffer =
    state.ok && (state.status === "parsed" || state.status === "confirmed");
  const isCompleted = state.ok && state.status === "transferred";

  function beginCommand() {
    if (commandInFlightRef.current) return false;

    commandInFlightRef.current = true;
    setIsCommandPending(true);
    return true;
  }

  function finishCommand() {
    commandInFlightRef.current = false;
    setIsCommandPending(false);
  }

  function resetLocalImportState() {
    setState(INITIAL_DEBTORS_1C_IMPORT_STATE);
    setPeriodYear(new Date().getFullYear());
    setPeriodMonth(new Date().getMonth() + 1);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeCleanPanel() {
    setIsDiscardConfirmOpen(false);
    resetLocalImportState();
    onClose();
  }

  function requestClose() {
    if (isParsePending || isCommandPending || isDiscardConfirmOpen) return;

    if (hasDiscardableBuffer) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    closeCleanPanel();
  }

  async function discardAndClose() {
    if (!state.ok) {
      closeCleanPanel();
      return;
    }

    if (!beginCommand()) return;

    try {
      const data = new FormData();
      data.set("houseId", houseId);

      const result = await discardDebtors1cImportBuffer(state, data);

      if (!result.ok || result.status !== "discarded") {
        setState(result);
        setIsDiscardConfirmOpen(false);
        return;
      }

      closeCleanPanel();
    } finally {
      finishCommand();
    }
  }

  async function execute(
    action:
      | typeof confirmDebtors1cImportPeriod
      | typeof discardDebtors1cImportBuffer
      | typeof transferDebtors1cImportBuffer,
    formData: FormData,
  ) {
    if (!beginCommand()) return;

    try {
      const result = await action(state, formData);
      setState(result);

      if (result.ok && result.status === "transferred") {
        router.refresh();
      }
    } finally {
      finishCommand();
    }
  }

  async function confirmAndTransfer() {
    if (!state.ok || !beginCommand()) return;

    try {
      let currentState: Debtors1cImportState = state;

      if (currentState.status === "parsed") {
        const confirmData = new FormData();
        confirmData.set("houseId", houseId);
        confirmData.set("periodYear", String(periodYear));
        confirmData.set("periodMonth", String(periodMonth));

        currentState = await confirmDebtors1cImportPeriod(
          currentState,
          confirmData,
        );
        setState(currentState);

        if (!currentState.ok || currentState.status !== "confirmed") {
          if (currentState.ok && currentState.status === "transferred") {
            router.refresh();
          }
          return;
        }
      }

      if (currentState.status !== "confirmed") {
        return;
      }

      const transferData = new FormData();
      transferData.set("houseId", houseId);

      const result = await transferDebtors1cImportBuffer(
        currentState,
        transferData,
      );
      setState(result);

      if (result.ok && result.status === "transferred") {
        router.refresh();
      }
    } finally {
      finishCommand();
    }
  }

  const transferBlocked =
    !state.ok || state.status === "discarded" || state.status === "transferred";

  return (
    <AdminSidePanel
      isOpen={isOpen}
      onClose={requestClose}
      maxWidthClassName="max-w-4xl"
      title="Імпорт боржників з 1С"
      description="Завантажте XLS/XLSX, перевірте звірку, підтвердьте період і передайте дані в місячну чернетку."
      footer={
        isCompleted ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeCleanPanel}
              className={adminPrimaryButtonClass}
            >
              Закрити
            </button>
          </div>
        ) : state.ok && state.status !== "discarded" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isCommandPending}
              onClick={() => {
                setIsDiscardConfirmOpen(true);
              }}
              className={`${adminSecondaryButtonClass} disabled:opacity-50`}
            >
              Скасувати буфер
            </button>

            <button
              type="button"
              disabled={transferBlocked || isCommandPending}
              onClick={() => {
                startTransition(() => {
                  void confirmAndTransfer();
                });
              }}
              className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isCommandPending
                ? "Передаємо..."
                : state.ok && state.status === "parsed"
                  ? "Підтвердити та передати"
                  : "Передати в чернетку"}
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {!state.ok && state.error ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
            {state.error}
          </div>
        ) : null}

        {state.ok && !isCompleted ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
            {state.message}
          </div>
        ) : null}

        {!isCompleted ? (
          <form action={parseAction} className="space-y-4">
            <input type="hidden" name="houseId" value={houseId} />
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".xls,.xlsx"
              className="block w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]"
            />
            <button
              type="submit"
              disabled={isParsePending}
              className={`${adminPrimaryButtonClass} disabled:opacity-50`}
            >
              {isParsePending ? "Обробляємо..." : "Обробити файл"}
            </button>
          </form>
        ) : null}

        {state.ok && !isCompleted ? (
          <>
            <div className="flex flex-wrap gap-2">
              <AdminStatusBadge tone="success">
                Зіставлено: {matchedCount}
              </AdminStatusBadge>
              <AdminStatusBadge
                tone={
                  state.unknownSourceAccounts.length > 0 ? "danger" : "success"
                }
              >
                Невідомих: {state.unknownSourceAccounts.length}
              </AdminStatusBadge>
              <AdminStatusBadge
                tone={state.warningCount > 0 ? "warning" : "neutral"}
              >
                Попереджень: {state.warningCount}
              </AdminStatusBadge>

              <AdminStatusBadge tone="neutral">
                Борг з 1С:{" "}
                {amountTotals.sourceDebt.toLocaleString("uk-UA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </AdminStatusBadge>

              <AdminStatusBadge tone="neutral">
                Баланс у системі:{" "}
                {amountTotals.systemBalance.toLocaleString("uk-UA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </AdminStatusBadge>
            </div>

            {state.ok && state.status === "parsed" ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] p-4 text-sm text-[var(--cms-warning-text)]">
                Перевірте звітний період. Кнопка «Підтвердити та передати»
                підтвердить вибраний місяць і рік та одразу створить чернетку.
              </div>
            ) : null}

            {unmatchedRows.length > 0 ? (
              <details className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
                <summary className="cursor-pointer font-semibold">
                  Не увійде до вітрини: {unmatchedRows.length} рахунків на суму{" "}
                  {unmatchedSourceDebtTotal.toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₴
                </summary>

                <div className="mt-3 space-y-2">
                  {unmatchedRows.map((row) => (
                    <div
                      key={`unmatched-${row.rowIndex}-${row.accountNumber}`}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <span>
                        {row.accountNumber}
                        {row.sourceApartmentLabel
                          ? ` · ${row.sourceApartmentLabel}`
                          : ""}
                      </span>
                      <span>
                        {(row.debtValue ?? 0).toLocaleString("uk-UA", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ₴
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {state.missingRegistryAccounts.length > 0 ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] p-4 text-sm text-[var(--cms-warning-text)]">
                У файлі немає рядків для рахунків реєстру:{" "}
                {state.missingRegistryAccounts.join(", ")}
              </div>
            ) : null}

            <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <div className="text-sm font-semibold text-[var(--cms-text)]">
                Звітний період
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                <select
                  value={periodMonth}
                  disabled={state.status !== "parsed"}
                  onChange={(event) =>
                    setPeriodMonth(Number(event.target.value))
                  }
                  className={adminInputClass}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={periodYear}
                  disabled={state.status !== "parsed"}
                  onChange={(event) =>
                    setPeriodYear(Number(event.target.value))
                  }
                  className={adminInputClass}
                />

                <button
                  type="button"
                  disabled={state.status !== "parsed" || isCommandPending}
                  onClick={() => {
                    const data = new FormData();
                    data.set("houseId", houseId);
                    data.set("periodYear", String(periodYear));
                    data.set("periodMonth", String(periodMonth));
                    startTransition(() => {
                      void execute(confirmDebtors1cImportPeriod, data);
                    });
                  }}
                  className={`${adminSecondaryButtonClass} disabled:opacity-50`}
                >
                  Підтвердити
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--cms-border)]">
              <div className="max-h-[52vh] overflow-auto">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 bg-[var(--cms-surface-elevated)]">
                    <tr className="border-b border-[var(--cms-border)] text-left">
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Кв.
                      </th>
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Л/С
                      </th>
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Власник
                      </th>
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Борг 1С
                      </th>
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Баланс OSBB
                      </th>
                      <th className="px-3 py-3 text-xs text-[var(--cms-text-muted)]">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((row) => (
                      <tr
                        key={`${row.rowIndex}-${row.accountNumber}`}
                        className="border-b border-[var(--cms-border)]"
                      >
                        <td className="px-3 py-3 text-sm text-[var(--cms-text)]">
                          {row.apartmentLabel ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-[var(--cms-text)]">
                          {row.accountNumber}
                        </td>
                        <td className="px-3 py-3 text-sm text-[var(--cms-text)]">
                          {row.ownerName ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-[var(--cms-text)]">
                          {row.debtValue ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-[var(--cms-text)]">
                          {row.osbbBalance ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <AdminStatusBadge
                            tone={
                              row.matchStatus === "matched"
                                ? row.warnings.length > 0
                                  ? "warning"
                                  : "success"
                                : "danger"
                            }
                          >
                            {row.matchStatus === "matched"
                              ? row.warnings.length > 0
                                ? `Зіставлено · ${row.warnings.length}`
                                : "Зіставлено"
                              : "Невідомий рахунок"}
                          </AdminStatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        {isCompleted && state.ok ? (
          <div className="rounded-[var(--r-xl)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] p-6 text-[var(--cms-success-text)]">
            <div className="text-lg font-semibold">
              Чернетку успішно створено
            </div>
            <p className="mt-2 text-sm leading-6">
              Дані імпорту передано один раз. Список боржників і історію версій
              оновлено.
            </p>
            {state.confirmedPeriod ? (
              <p className="mt-3 text-sm font-medium">
                Період: {MONTHS[state.confirmedPeriod.month - 1]}{" "}
                {state.confirmedPeriod.year}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <PlatformConfirmModal
        open={isDiscardConfirmOpen}
        title="Скасувати імпорт з 1С?"
        description="Завантажений preview і тимчасовий буфер буде видалено. Після закриття файл потрібно буде завантажити повторно."
        confirmLabel="Скасувати імпорт"
        cancelLabel="Продовжити перевірку"
        tone="warning"
        isPending={isCommandPending}
        pendingLabel="Скасовуємо..."
        onConfirm={() => {
          startTransition(() => {
            void discardAndClose();
          });
        }}
        onCancel={() => {
          if (!isCommandPending) {
            setIsDiscardConfirmOpen(false);
          }
        }}
      />
    </AdminSidePanel>
  );
}
