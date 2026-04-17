"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { exportDebtorsRegistry, parseDebtorsImportFile, type DebtorsSpreadsheetRow } from "@/src/modules/houses/utils/debtorsSpreadsheet";
import type { AdminHouseApartmentListItem } from "@/src/modules/apartments/services/getAdminHouseApartments";

type WorkspaceTab = "all" | "published" | "draft";

type DebtSnapshotItem = {
  apartmentId: string;
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: number | null;
  amount: string;
  days: string;
};

type DebtorsPayment = {
  url: string;
  title: string;
  note: string;
  buttonLabel: string;
};

type Props = {
  houseId: string;
  houseSlug: string;
  apartments: AdminHouseApartmentListItem[];
  section: {
    id: string;
    title: string | null;
    content: Record<string, unknown>;
  } | null;
};

const initialState = {
  error: null,
  planItems: null as unknown[] | null,
};

const DEFAULT_PAYMENT: DebtorsPayment = {
  url: "",
  title: "Оплата задолженности",
  note: "",
  buttonLabel: "Оплатить",
};

function normalizeSnapshotItems(value: unknown): DebtSnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;

      return {
        apartmentId: String(raw.apartmentId ?? "").trim(),
        apartmentLabel: String(raw.apartmentLabel ?? "").trim(),
        accountNumber: String(raw.accountNumber ?? "").trim(),
        ownerName: String(raw.ownerName ?? "").trim(),
        area:
          typeof raw.area === "number" && Number.isFinite(raw.area)
            ? raw.area
            : null,
        amount: String(raw.amount ?? "").trim(),
        days: String(raw.days ?? "").trim(),
      };
    })
    .filter((item): item is DebtSnapshotItem => Boolean(item?.apartmentId));
}

function normalizePayment(value: unknown): DebtorsPayment {
  if (!value || typeof value !== "object") {
    return DEFAULT_PAYMENT;
  }

  const raw = value as Record<string, unknown>;

  return {
    url: String(raw.url ?? "").trim(),
    title:
      String(raw.title ?? DEFAULT_PAYMENT.title).trim() || DEFAULT_PAYMENT.title,
    note: String(raw.note ?? "").trim(),
    buttonLabel:
      String(raw.buttonLabel ?? DEFAULT_PAYMENT.buttonLabel).trim() ||
      DEFAULT_PAYMENT.buttonLabel,
  };
}

function formatArea(value: number | null) {
  if (value === null) return "—";

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeDecimalInput(value: string) {
  return value.replace(",", ".");
}

function isPositiveAmount(value: string) {
  if (!value.trim()) return false;

  const normalized = Number(normalizeDecimalInput(value));
  return Number.isFinite(normalized) && normalized > 0;
}

function formatSummaryAmount(items: DebtSnapshotItem[]) {
  const total = items.reduce((sum, item) => {
    const amount = Number(normalizeDecimalInput(item.amount));
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(total);
}

export function HouseDebtorsWorkspace({
  houseId,
  houseSlug,
  apartments,
  section,
}: Props) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<
    "save_draft" | "publish_draft" | "delete_draft" | "save_payment" | null
  >(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const content =
    section &&
    typeof section.content === "object" &&
    section.content
      ? section.content
      : {};

  const [payment, setPayment] = useState<DebtorsPayment>(
    normalizePayment(content.payment),
  );
  const activeItems = normalizeSnapshotItems(content.activeItems);
  const draftItems = normalizeSnapshotItems(content.draftItems);

  const overlayItems = draftItems.length > 0 ? draftItems : activeItems;

  const [workingRows, setWorkingRows] = useState<DebtSnapshotItem[]>(
    apartments.map((apartment) => {
      const existing = overlayItems.find(
        (item) => item.apartmentId === apartment.id,
      );

      return {
        apartmentId: apartment.id,
        apartmentLabel: apartment.apartment_label,
        accountNumber: apartment.account_number,
        ownerName: apartment.owner_name,
        area: apartment.area,
        amount: existing?.amount ?? "",
        days: existing?.days ?? "",
      };
    }),
  );

  useEffect(() => {
    if (isPending || state.error || !submittedMode) {
      return;
    }

    if (submittedMode === "save_draft") {
      startTransition(() => {
        setIsPreviewOpen(false);
        router.refresh();
      });
    }

    if (
      submittedMode === "publish_draft" ||
      submittedMode === "delete_draft" ||
      submittedMode === "save_payment"
    ) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [isPending, router, state.error, submittedMode]);

  const previewItems = useMemo(
    () => workingRows.filter((item) => isPositiveAmount(item.amount)),
    [workingRows],
  );

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const source =
      activeTab === "all"
        ? workingRows
        : activeTab === "published"
          ? activeItems.filter((item) => isPositiveAmount(item.amount))
          : draftItems.filter((item) => isPositiveAmount(item.amount));

    if (!query) {
      return source;
    }

    return source.filter((item) =>
      [item.apartmentLabel, item.accountNumber, item.ownerName]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeItems, activeTab, draftItems, searchQuery, workingRows]);

  const hasAnyEditableValue = useMemo(
    () =>
      workingRows.some(
        (item) => item.amount.trim() || item.days.trim(),
      ),
    [workingRows],
  );

  function updateField(
    apartmentId: string,
    field: "amount" | "days",
    value: string,
  ) {
    const nextValue = field === "amount" ? value.replace(/[^\d.,]/g, "") : value.replace(/[^\d]/g, "");

    setWorkingRows((prev) =>
      prev.map((item) =>
        item.apartmentId === apartmentId
          ? { ...item, [field]: nextValue }
          : item,
      ),
    );
  }

  function clearAllDebtFields() {
    setWorkingRows((prev) =>
      prev.map((item) => ({
        ...item,
        amount: "",
        days: "",
      })),
    );
  }

  function openPreview() {
    setIsPreviewOpen(true);
  }

  function closePreview() {
    if (isPending) return;
    setIsPreviewOpen(false);
  }

  function submitDebtorsMode(
    mode: "save_draft" | "publish_draft" | "delete_draft" | "save_payment",
    payload?: string,
  ) {
    if (!section) return;

    const formData = new FormData();
    formData.set("sectionId", section.id);
    formData.set("houseId", houseId);
    formData.set("houseSlug", houseSlug);
    formData.set("title", section.title ?? "Должники");
    formData.set("status", "published");
    formData.set("kind", "debtors");
    formData.set("debtorsMode", mode);

    if (payload) {
      formData.set("debtorsPayload", payload);
    }

    setSubmittedMode(mode);

    startTransition(() => {
      formAction(formData);
    });
  }

  function submitDraftSave() {
    const payload = JSON.stringify({
      payment,
      draftItems: previewItems.map((item) => ({
        apartmentId: item.apartmentId,
        apartmentLabel: item.apartmentLabel,
        accountNumber: item.accountNumber,
        ownerName: item.ownerName,
        area: item.area,
        amount: normalizeDecimalInput(item.amount),
        days: item.days.trim(),
      })),
    });

    submitDebtorsMode("save_draft", payload);
  }

  function savePaymentSettings() {
    const payload = JSON.stringify({
      payment,
    });

    submitDebtorsMode("save_payment", payload);
  }

  function publishDraft() {
    submitDebtorsMode("publish_draft");
  }

  function deleteDraft() {
    submitDebtorsMode("delete_draft");
  }

  function buildReferenceRows(rows: DebtSnapshotItem[]): DebtorsSpreadsheetRow[] {
    return rows.map((row) => ({
      apartmentLabel: row.apartmentLabel,
      accountNumber: row.accountNumber,
      ownerName: row.ownerName,
      area: row.area === null ? "" : String(row.area).replace(".", ","),
      amount: row.amount,
      days: row.days,
    }));
  }

  function handleExport() {
    exportDebtorsRegistry({
      houseName: section?.title ?? houseSlug,
      rows: workingRows.map((row) => ({
        apartmentLabel: row.apartmentLabel,
        accountNumber: row.accountNumber,
        ownerName: row.ownerName,
        area: row.area,
        amount: row.amount,
        days: row.days,
      })),
    });
  }

  function openImportPicker() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  async function handleImportFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setImportError(null);

    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const result = await parseDebtorsImportFile({
        file,
        referenceRows: buildReferenceRows(workingRows),
      });

      const importedMap = new Map(
        result.rows.map((row) => [
          [
            row.apartmentLabel,
            row.accountNumber,
            row.ownerName,
            row.area,
          ].join("||"),
          row,
        ]),
      );

      setWorkingRows((prev) =>
        prev.map((row) => {
          const key = [
            row.apartmentLabel,
            row.accountNumber,
            row.ownerName,
            row.area === null ? "" : String(row.area).replace(".", ","),
          ].join("||");

          const imported = importedMap.get(key);

          if (!imported) {
            return row;
          }

          return {
            ...row,
            amount: imported.amount,
            days: imported.days,
          };
        }),
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Не удалось импортировать файл должников.",
      );
    } finally {
      setIsImporting(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const initialPayment = normalizePayment(content.payment);
  const paymentDirty =
    JSON.stringify(payment) !== JSON.stringify(DEFAULT_PAYMENT);
  const paymentSaveSuccess =
    submittedMode === "save_payment" && !isPending && !state.error;
  const totalApartmentsCount = workingRows.length;
  const publishedDebtorsCount = activeItems.filter((item) =>
    isPositiveAmount(item.amount),
  ).length;
  const draftDebtorsCount = draftItems.filter((item) =>
    isPositiveAmount(item.amount),
  ).length;
  const isDraftEmpty = draftDebtorsCount === 0;
  const isPublishedEmpty = publishedDebtorsCount === 0;
  const isPreviewEmpty = previewItems.length === 0;
  const trimmedPaymentUrl = payment.url.trim();
  const hasPaymentUrl = Boolean(trimmedPaymentUrl);

  const isPaymentUrlValid =
    !hasPaymentUrl ||
    /^https?:\/\//i.test(trimmedPaymentUrl);

  const paymentBlockReady = hasPaymentUrl && isPaymentUrlValid;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Должники</h2>
            <p className="mt-2 text-sm text-slate-400">
              Управление реестром задолженностей по квартирам, черновиком публикации и опубликованным списком для жильцов.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { key: "all", label: "Все квартиры", count: totalApartmentsCount },
              { key: "published", label: "Опубликовано", count: publishedDebtorsCount },
              { key: "draft", label: "Черновик", count: draftDebtorsCount },
            ].map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as WorkspaceTab)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "border border-slate-700 bg-slate-950/40 text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-slate-200 text-slate-950"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        {state.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {importError ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {importError}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={handleImportFileChange}
        className="hidden"
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Поиск: квартира / лицевой счет / владелец"
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
        />

        {activeTab === "all" ? (
          <>
            <button
              type="button"
              onClick={openImportPicker}
              disabled={isImporting}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 disabled:opacity-50"
            >
              {isImporting ? "Импорт..." : "Import"}
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300"
            >
              Export
            </button>

            <button
              type="button"
              onClick={clearAllDebtFields}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300"
            >
              Очистить
            </button>

            <button
              type="button"
              disabled={!hasAnyEditableValue}
              onClick={openPreview}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Сохранить
            </button>
          </>
        ) : null}
      </div>

      {activeTab === "draft" && isDraftEmpty ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-8 text-base leading-7 text-slate-300">
          Черновик пока пуст. После подготовки списка должников и сохранения preview он появится здесь.
        </div>
      ) : null}
      {activeTab === "draft" && !isDraftEmpty ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-200">
              Черновик готов к публикации
            </p>
            <p className="mt-1 text-xs text-amber-300/80">
              После публикации текущий опубликованный список будет полностью заменен.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={deleteDraft}
              disabled={isPending}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 disabled:opacity-50"
            >
              Удалить черновик
            </button>

            <button
              type="button"
              onClick={publishDraft}
              disabled={isPending}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              Подтвердить публикацию
            </button>
          </div>
        </div>
      ) : null}


      {activeTab === "published" && isPublishedEmpty ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-8 text-base leading-7 text-slate-300">
          Опубликованный список пока пуст. После подтверждения черновика здесь появятся квартиры с задолженностью.
        </div>
      ) : null}
      {activeTab === "all" ? (
        <div
          className="rounded-3xl border border-slate-800 p-5 transition hover:border-slate-700"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsPaymentSettingsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsPaymentSettingsOpen(true);
              }
            }}
            className="flex cursor-pointer flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-white">
                Блок оплаты задолженности
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Заполните ссылку, заголовок и текст для публичного блока оплаты, который увидят жильцы на сайте дома.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                paymentBlockReady
                  ? "bg-emerald-500/20 text-emerald-300"
                  : hasPaymentUrl && !isPaymentUrlValid
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-red-500/20 text-red-300"
              }`}>
                {paymentBlockReady
                  ? "Блок оплаты заполнен"
                  : hasPaymentUrl && !isPaymentUrlValid
                    ? "Проверьте формат ссылки"
                    : "Заполните блок оплаты"}
              </div>
            </div>
          </div>

          {paymentSaveSuccess ? (
            <div className="mt-4 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              Настройки блока оплаты сохранены.
            </div>
          ) : null}

          {isPaymentSettingsOpen ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsPaymentSettingsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
                  aria-label="Закрыть настройки оплаты"
                >
                  ×
                </button>
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Ссылка общей оплаты
                </div>
                <input
                  value={payment.url}
                  onChange={(event) =>
                    setPayment((prev) => ({ ...prev, url: event.target.value }))
                  }
                  placeholder="https://pay.example.com/debtors"
                  className={`w-full rounded-2xl border px-4 py-3 text-sm text-white ${
                    hasPaymentUrl && !isPaymentUrlValid
                      ? "border-amber-500 bg-amber-950/20"
                      : "border-slate-700 bg-slate-950"
                  }`}
                />
                <div className="mt-2 text-xs text-slate-400">
                  Эта ссылка будет использоваться в публичном блоке оплаты для перехода жильца к оплате задолженности.
                </div>
                {hasPaymentUrl && !isPaymentUrlValid ? (
                  <div className="mt-2 text-xs text-amber-400">
                    Ссылка должна начинаться с http:// или https://
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Текст кнопки
                </div>
                <input
                  value={payment.buttonLabel}
                  onChange={(event) =>
                    setPayment((prev) => ({
                      ...prev,
                      buttonLabel: event.target.value,
                    }))
                  }
                  placeholder="Оплатить"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Заголовок блока
                </div>
                <input
                  value={payment.title}
                  onChange={(event) =>
                    setPayment((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Оплата задолженности"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </div>

              <div className="md:col-span-2">
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Описание для жителя
                </div>
                <textarea
                  value={payment.note}
                  onChange={(event) =>
                    setPayment((prev) => ({ ...prev, note: event.target.value }))
                  }
                  placeholder="Например: введите лицевой счет, проверьте сумму долга и перейдите к оплате."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </div>

              <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Preview public блока
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {payment.title || "Оплата задолженности"}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {payment.note || "Описание блока оплаты появится здесь."}
                </div>
                <div className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950">
                  {payment.buttonLabel || "Оплатить"}
                </div>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={savePaymentSettings}
                  disabled={!section || !paymentDirty || !isPaymentUrlValid || isPending}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending && submittedMode === "save_payment"
                    ? "Сохраняем..."
                    : "Сохранить"}
                </button>

                <button
                  type="button"
                  onClick={() => setPayment(DEFAULT_PAYMENT)}
                  disabled={!paymentDirty || isPending}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Сбросить
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "all" && filteredRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-8 text-base leading-7 text-slate-300">
          В этом доме пока нет квартир для работы с задолженностями. Сначала добавьте квартиры в разделе «Квартиры», после этого здесь появится реестр.
        </div>
      ) : filteredRows.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-slate-800">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-xs text-slate-400">Кв.</th>
                  <th className="px-4 py-3 text-xs text-slate-400">Л/С</th>
                  <th className="px-4 py-3 text-xs text-slate-400">Владелец</th>
                  <th className="px-4 py-3 text-xs text-slate-400">Площадь</th>
                  <th className="px-4 py-3 text-xs text-slate-400">Долг</th>
                  <th className="px-4 py-3 text-xs text-slate-400">Дни</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.apartmentId}
                    className="border-b border-slate-800"
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {row.apartmentLabel}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {row.accountNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {row.ownerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {formatArea(row.area)}
                    </td>

                    <td className="px-4 py-3">
                      {activeTab === "all" ? (
                        <input
                          value={row.amount}
                          onChange={(event) =>
                            updateField(row.apartmentId, "amount", event.target.value)
                          }
                          inputMode="decimal"
                          placeholder="0.00"
                          className="w-[140px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        />
                      ) : (
                        <span className="text-sm text-white">
                          {row.amount || "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {activeTab === "all" ? (
                        <input
                          value={row.days}
                          onChange={(event) =>
                            updateField(row.apartmentId, "days", event.target.value)
                          }
                          inputMode="numeric"
                          placeholder="—"
                          className="w-[100px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                        />
                      ) : (
                        <span className="text-sm text-white">
                          {row.days || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <button
            type="button"
            onClick={closePreview}
            className="absolute inset-0"
            aria-label="Закрыть preview"
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-5">
              <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                Preview перед сохранением
              </div>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                Проверьте список должников
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                В черновик будут сохранены только квартиры, где заполнена сумма долга.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Должников: {previewItems.length}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  Общая сумма: {formatSummaryAmount(previewItems)}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              {isPreviewEmpty ? (
                <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
                  В preview нет строк для сохранения. Укажите сумму долга хотя бы для одной квартиры.
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-800">
                  <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-950">
                      <tr className="border-b border-slate-800 text-left">
                        <th className="px-4 py-3 text-xs text-slate-400">Кв.</th>
                        <th className="px-4 py-3 text-xs text-slate-400">Л/С</th>
                        <th className="px-4 py-3 text-xs text-slate-400">Владелец</th>
                        <th className="px-4 py-3 text-xs text-slate-400">Площадь</th>
                        <th className="px-4 py-3 text-xs text-slate-400">Долг</th>
                        <th className="px-4 py-3 text-xs text-slate-400">Дни</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((row) => (
                        <tr key={row.apartmentId} className="border-b border-slate-800">
                          <td className="px-4 py-3 text-sm text-white">{row.apartmentLabel}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{row.accountNumber}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{row.ownerName}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{formatArea(row.area)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">{row.amount}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">{row.days || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300"
                >
                  Назад
                </button>

                <button
                  type="button"
                  disabled={isPreviewEmpty || !section || isPending}
                  onClick={submitDraftSave}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Сохраняем..." : "Сохранить в черновик"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
