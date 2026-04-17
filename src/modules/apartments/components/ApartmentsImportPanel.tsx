"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  replaceHouseApartmentsByImport,
  type ReplaceHouseApartmentsByImportState,
} from "@/src/modules/apartments/actions/replaceHouseApartmentsByImport";
import {
  APARTMENTS_IMPORT_HEADERS,
  parseApartmentsImportFile,
  type ApartmentsImportRow,
} from "@/src/modules/apartments/utils/parseApartmentsImportFile";

type ApartmentsImportPanelProps = {
  houseId: string;
  houseName: string;
  onClose: () => void;
};

const initialState: ReplaceHouseApartmentsByImportState = {
  error: null,
  success: null,
};

export function ApartmentsImportPanel({
  houseId,
  houseName,
  onClose,
}: ApartmentsImportPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewRows, setPreviewRows] = useState<ApartmentsImportRow[]>([]);
  const [rowsPayload, setRowsPayload] = useState("[]");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const [state, formAction, isPending] = useActionState(
    replaceHouseApartmentsByImport,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      startTransition(() => {
        router.refresh();
        onClose();
      });
    }
  }, [onClose, router, state.success]);

  const totalRows = previewRows.length;
  const canSubmit = totalRows > 0 && confirmReplace && !isPending && !isParsing;

  const previewSummary = useMemo(
    () => ({
      rows: totalRows,
      withArea: previewRows.filter((row) => row.area.trim()).length,
    }),
    [previewRows, totalRows],
  );

  function resetSelectedFile() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setParseError(null);
    setPreviewRows([]);
    setRowsPayload("[]");
    setConfirmReplace(false);

    if (!file) {
      return;
    }

    setIsParsing(true);

    try {
      const result = await parseApartmentsImportFile(file);
      setPreviewRows(result.rows);
      setRowsPayload(JSON.stringify(result.rows));
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "Не удалось прочитать файл импорта.",
      );
      setPreviewRows([]);
      setRowsPayload("[]");
      setConfirmReplace(false);
      resetSelectedFile();
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Закрыть панель импорта квартир"
      />

      <div className="relative z-10 flex h-full w-full max-w-[1100px] flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Импорт квартир
            </div>

            <h2 className="mt-3 text-xl font-semibold text-white">
              Загрузка для дома {houseName}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Загрузите CSV, XLS или XLSX. Активный список квартир будет полностью заменен данными из файла.
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

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="houseId" value={houseId} />
          <input type="hidden" name="rows" value={rowsPayload} />

          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Файл импорта
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                  />

                  <div className="mt-2 text-xs text-slate-400">
                    Обязательные колонки: {APARTMENTS_IMPORT_HEADERS.join(" / ")}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                    Строк всего: {previewSummary.rows}
                  </span>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                    С площадью: {previewSummary.withArea}
                  </span>
                </div>
              </div>

              {isParsing ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                  Читаем файл и проверяем структуру...
                </div>
              ) : null}

              {parseError ? (
                <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                  {parseError}
                </div>
              ) : null}

              {state.error ? (
                <div className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
                  {state.error}
                </div>
              ) : null}

              {previewRows.length > 0 ? (
                <>
                  <div className="mt-4 rounded-2xl border border-amber-900 bg-amber-950/30 px-4 py-2.5 text-sm text-amber-200">
                    После подтверждения активный список квартир выбранного дома будет полностью заменен новым файлом.
                  </div>

                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800">
                    <div className="max-h-[58vh] overflow-auto">
                      <table className="min-w-full border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-950/95">
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              #
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Лицевой счет
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Квартира
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Владелец
                            </th>
                            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Квадраты
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {previewRows.map((row, index) => (
                            <tr
                              key={`${row.accountNumber}-${row.apartmentLabel}-${index}`}
                              className="border-b border-slate-800 bg-slate-900/70"
                            >
                              <td className="px-4 py-2.5 text-sm text-slate-500">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-slate-300">
                                {row.accountNumber}
                              </td>
                              <td className="px-4 py-2.5 text-sm font-medium text-white">
                                {row.apartmentLabel}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-slate-300">
                                {row.ownerName}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-slate-300">
                                {row.area || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-800 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 lg:max-w-[720px]">
                <input
                  type="checkbox"
                  checked={confirmReplace}
                  onChange={(event) => setConfirmReplace(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950"
                  disabled={previewRows.length === 0}
                />
                <span className="leading-6">
                  Подтверждаю, что нужно полностью заменить текущий активный список квартир выбранного дома данными из файла.
                </span>
              </label>

              <div className="flex gap-3 self-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Импортируем..." : "Подтвердить импорт"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
