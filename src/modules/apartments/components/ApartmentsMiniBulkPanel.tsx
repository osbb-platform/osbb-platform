"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createApartmentsMiniBulk,
  type CreateApartmentsMiniBulkState,
} from "@/src/modules/apartments/actions/createApartmentsMiniBulk";

type MiniBulkRow = {
  accountNumber: string;
  apartmentLabel: string;
  ownerName: string;
  area: string;
};

type ApartmentsMiniBulkPanelProps = {
  houseId: string;
  houseName: string;
  onClose: () => void;
};

const initialState: CreateApartmentsMiniBulkState = {
  error: null,
  successMessage: null,
};

function createEmptyRow(): MiniBulkRow {
  return {
    accountNumber: "",
    apartmentLabel: "",
    ownerName: "",
    area: "",
  };
}

function createInitialRows(count: number = 5) {
  return Array.from({ length: count }, () => createEmptyRow());
}

function isAreaValid(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  return /^-?\d+(?:[.,]\d+)?$/.test(trimmed);
}

function hasMissingRequiredFields(row: MiniBulkRow) {
  const hasAnyValue =
    row.accountNumber.trim() ||
    row.apartmentLabel.trim() ||
    row.ownerName.trim() ||
    row.area.trim();

  if (!hasAnyValue) {
    return false;
  }

  return (
    !row.accountNumber.trim() ||
    !row.apartmentLabel.trim() ||
    !row.ownerName.trim()
  );
}

export function ApartmentsMiniBulkPanel({
  houseId,
  houseName,
  onClose,
}: ApartmentsMiniBulkPanelProps) {
  const router = useRouter();
  const [rows, setRows] = useState<MiniBulkRow[]>(createInitialRows);
  const [rowsPayload, setRowsPayload] = useState("[]");
  const [state, formAction, isPending] = useActionState(
    createApartmentsMiniBulk,
    initialState,
  );

  useEffect(() => {
    if (state.successMessage) {
      startTransition(() => {
        router.refresh();
        onClose();
      });
    }
  }, [onClose, router, state.successMessage]);

  const filledRowsCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.accountNumber.trim() ||
          row.apartmentLabel.trim() ||
          row.ownerName.trim() ||
          row.area.trim(),
      ).length,
    [rows],
  );

  const invalidAreaRowIndexes = useMemo(
    () =>
      rows.reduce<number[]>((acc, row, index) => {
        if (!isAreaValid(row.area)) {
          acc.push(index);
        }
        return acc;
      }, []),
    [rows],
  );

  const hasInvalidAreas = invalidAreaRowIndexes.length > 0;
  const hasMissingRequiredRows = rows.some(hasMissingRequiredFields);
  const isSubmitDisabled =
    isPending ||
    filledRowsCount === 0 ||
    hasInvalidAreas ||
    hasMissingRequiredRows;

  function updateRow(index: number, key: keyof MiniBulkRow, value: string) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  }

  function removeRow(index: number) {
    setRows((current) => {
      if (current.length <= 5) {
        return current.map((row, rowIndex) =>
          rowIndex === index ? createEmptyRow() : row,
        );
      }

      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function addMoreRows() {
    setRows((current) => {
      if (current.length >= 20) return current;
      const nextCount = Math.min(current.length + 5, 20);
      return [...current, ...createInitialRows(nextCount - current.length)];
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (filledRowsCount === 0 || hasInvalidAreas || hasMissingRequiredRows) {
      event.preventDefault();
      return;
    }

    setRowsPayload(JSON.stringify(rows));
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Закрыть панель ручного добавления квартир"
      />

      <div className="relative z-10 flex h-full w-full max-w-[980px] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-6">
          <div>
            <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Ручное добавление
            </div>

            <h2 className="mt-4 text-2xl font-semibold text-white">
              Квартиры для дома {houseName}
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-400">
              Заполните до 20 строк. Сохраняются только строки, где указаны лицевой счет, квартира и владелец.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 text-lg text-white transition hover:bg-slate-800"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="border-b border-slate-800 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Дом: {houseName}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Строк заполнено: {filledRowsCount}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Лимит: 20
            </span>
          </div>
        </div>

        <form
          action={formAction}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="houseId" value={houseId} />
          <input type="hidden" name="rows" value={rowsPayload} />

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
            <div className="overflow-hidden rounded-3xl border border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-950/90">
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        #
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Лицевой счет *
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Квартира *
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Владелец *
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Квадраты
                      </th>
                      <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Действие
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, index) => {
                      const areaInvalid = !isAreaValid(row.area);

                      return (
                        <tr
                          key={index}
                          className="border-b border-slate-800 bg-slate-900/70 align-top"
                        >
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={row.accountNumber}
                              onChange={(event) =>
                                updateRow(index, "accountNumber", event.target.value)
                              }
                              placeholder="Например, 100245"
                              className="w-full min-w-[150px] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={row.apartmentLabel}
                              onChange={(event) =>
                                updateRow(index, "apartmentLabel", event.target.value)
                              }
                              placeholder="Например, 24"
                              className="w-full min-w-[140px] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={row.ownerName}
                              onChange={(event) =>
                                updateRow(index, "ownerName", event.target.value)
                              }
                              placeholder="ФИО владельца"
                              className="w-full min-w-[220px] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
                            />
                          </td>

                          <td className="px-4 py-4">
                            <input
                              type="text"
                              value={row.area}
                              onChange={(event) =>
                                updateRow(index, "area", event.target.value)
                              }
                              placeholder="45,5"
                              className={
                                areaInvalid
                                  ? "w-full min-w-[120px] rounded-2xl border border-red-800 bg-red-950/20 px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                                  : "w-full min-w-[120px] rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
                              }
                            />

                            {areaInvalid ? (
                              <div className="mt-2 text-xs text-red-300">
                                Допустимы только числа, например 45, 45.5 или 45,5
                              </div>
                            ) : null}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                            >
                              Очистить
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {rows.length < 20 ? (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={addMoreRows}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  + еще 5
                </button>
              </div>
            ) : null}

            {hasInvalidAreas ? (
              <div className="mt-6 rounded-2xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
                Исправьте формат поля «Квадраты» в подсвеченных строках перед сохранением.
              </div>
            ) : null}

            {hasMissingRequiredRows ? (
              <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                Есть строки с незаполненными обязательными полями. Заполните лицевой счет, квартиру и владельца либо удалите такую строку.
              </div>
            ) : null}

            {state.error ? (
              <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                {state.error}
              </div>
            ) : null}

            {state.successMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
                {state.successMessage}
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-800 px-6 py-5">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Сохраняем..." : "Добавить квартиры"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
