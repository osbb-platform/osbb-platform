"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
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

  async function execute(
    action:
      | typeof confirmDebtors1cImportPeriod
      | typeof discardDebtors1cImportBuffer
      | typeof transferDebtors1cImportBuffer,
    formData: FormData,
  ) {
    setIsCommandPending(true);

    try {
      const result = await action(state, formData);
      setState(result);

      if (result.ok && result.status === "transferred") {
        router.refresh();
      }
    } finally {
      setIsCommandPending(false);
    }
  }

  const transferBlocked =
    !state.ok ||
    state.status !== "confirmed" ||
    state.unknownSourceAccounts.length > 0;

  return (
    <AdminSidePanel
      isOpen={isOpen}
      onClose={() => {
        if (!isParsePending && !isCommandPending) onClose();
      }}
      title="Імпорт боржників з 1С"
      description="Завантажте XLS/XLSX, перевірте звірку, підтвердьте період і передайте дані в місячну чернетку."
      footer={
        state.ok &&
        state.status !== "discarded" &&
        state.status !== "transferred" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isCommandPending}
              onClick={() => {
                const data = new FormData();
                data.set("houseId", houseId);
                startTransition(() => {
                  void execute(discardDebtors1cImportBuffer, data);
                });
              }}
              className={`${adminSecondaryButtonClass} disabled:opacity-50`}
            >
              Скасувати буфер
            </button>

            <button
              type="button"
              disabled={transferBlocked || isCommandPending}
              onClick={() => {
                const data = new FormData();
                data.set("houseId", houseId);
                startTransition(() => {
                  void execute(transferDebtors1cImportBuffer, data);
                });
              }}
              className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {isCommandPending ? "Передаємо..." : "Передати в чернетку"}
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

        {state.ok ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
            {state.message}
          </div>
        ) : null}

        <form action={parseAction} className="space-y-4">
          <input type="hidden" name="houseId" value={houseId} />
          <input
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

        {state.ok ? (
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

            {state.unknownSourceAccounts.length > 0 ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
                <strong>Передача заблокована.</strong> Невідомі особові рахунки:{" "}
                {state.unknownSourceAccounts.join(", ")}
              </div>
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

            {state.status === "transferred" ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] p-4 text-sm text-[var(--cms-success-text)]">
                Чернетку створено. Snapshot: {state.snapshotId}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AdminSidePanel>
  );
}
