import { useRouter } from "next/navigation";
"use client";

import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { startTransition, useActionState, useMemo, useRef, useState, useTransition } from "react";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
} from "@/src/shared/utils/validators/pdfUpload";

const initialState = {
  error: null,
};

type SectionStatus = "draft" | "in_review" | "published" | "archived";
type ReportStatus = "draft" | "active" | "archived";
type PeriodType = "current" | "past";
type TabKey = "current" | "past" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";

type ReportItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  reportDate: string;
  periodType: PeriodType;
  month?: string;
  year?: number;
  isPinned?: boolean;
  isNew?: boolean;
  newUntil?: string | null;
  status: ReportStatus;
  pdfFileName?: string;
  pdfPath?: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

type Props = {
  readOnlyMode?: boolean;
  houseId: string;
  houseSlug: string;
  sectionId: string;
  sectionTitle: string | null;
  sectionStatus: SectionStatus;
  reports: ReportItem[];
  categoriesCatalog?: string[];
};

const CURRENT_MONTH_OPTIONS = [
  { value: "01", label: "Январь" },
  { value: "02", label: "Февраль" },
  { value: "03", label: "Март" },
  { value: "04", label: "Апрель" },
  { value: "05", label: "Май" },
  { value: "06", label: "Июнь" },
  { value: "07", label: "Июль" },
  { value: "08", label: "Август" },
  { value: "09", label: "Сентябрь" },
  { value: "10", label: "Октябрь" },
  { value: "11", label: "Ноябрь" },
  { value: "12", label: "Декабрь" },
];

const DEFAULT_CATEGORIES = [
  "Выполненные работы",
  "Финансовый отчет",
  "Ремонт и обслуживание",
  "Инженерные системы",
];

function createReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value: string) {
  if (!value) return "Дата не указана";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status: ReportStatus) {
  if (status === "active") return "Активный";
  if (status === "archived") return "Архив";
  return "Черновик";
}

function getStatusBadgeClasses(status: ReportStatus) {
  if (status === "active") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }

  if (status === "archived") {
    return "border border-slate-600 bg-slate-700 text-slate-200";
  }

  return "border border-amber-500/20 bg-amber-500/15 text-amber-300";
}

function getMonthLabel(value: string | undefined) {
  if (!value) return "Месяц не указан";

  return (
    CURRENT_MONTH_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

function getDefaultSectionStatus(status: SectionStatus): SectionStatus {
  if (status === "archived") {
    return "published";
  }

  return status || "published";
}

function getEmptyDraft(tab: TabKey, firstCategory: string): ReportItem {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (tab === "past") {
    return {
      id: createReportId(),
      title: "",
      description: "",
      category: firstCategory,
      reportDate: "",
      periodType: "past",
      year: currentYear - 1,
      status: "draft",
      isPinned: false,
      isNew: false,
      newUntil: null,
      pdfFileName: "",
      pdfPath: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null,
    };
  }

  if (tab === "archive") {
    return {
      id: createReportId(),
      title: "",
      description: "",
      category: firstCategory,
      reportDate: "",
      periodType: "current",
      month: "",
      status: "draft",
      isPinned: false,
      isNew: false,
      newUntil: null,
      pdfFileName: "",
      pdfPath: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null,
    };
  }

  return {
    id: createReportId(),
    title: "",
    description: "",
    category: firstCategory,
    reportDate: "",
    periodType: "current",
    month: "",
    status: "draft",
    isPinned: false,
    isNew: false,
    newUntil: null,
    pdfFileName: "",
    pdfPath: "",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    archivedAt: null,
  };
}

const supabase = createSupabaseBrowserClient();

export function HouseReportsWorkspace({
  houseId,
  houseSlug,
  sectionId,
  sectionTitle,
  sectionStatus,
  reports,
  categoriesCatalog = [],
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const [isDeletingArchive, startDeleteArchiveTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabKey>("current");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [removeReportPdf, setRemoveReportPdf] = useState(false);
  const [selectedPdfLabel, setSelectedPdfLabel] = useState("");
  const [reportPdfError, setReportPdfError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"publish" | "archive" | "delete" | "delete_archive" | null>(null);
  const [submitIntent, setSubmitIntent] = useState<"save" | "publish" | "archive" | "delete" | "delete_archive">("save");
  const [actionLabel, setActionLabel] = useState("Обрабатываем отчет...");
  const reportPdfInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const categoryOptions = useMemo(() => {
    const dynamicCategories = reports
      .map((item) => item.category)
      .filter((item) => Boolean(item.trim()));

    return Array.from(
      new Set([
        ...DEFAULT_CATEGORIES,
        ...categoriesCatalog.filter((item) => item.trim()),
        ...dynamicCategories,
      ]),
    );
  }, [reports, categoriesCatalog]);

  const firstCategory = categoryOptions[0] ?? DEFAULT_CATEGORIES[0];

  const [draft, setDraft] = useState<ReportItem>(
    getEmptyDraft("current", firstCategory),
  );

  const currentReports = useMemo(
    () =>
      reports.filter(
        (item) => item.periodType === "current" && item.status !== "archived",
      ),
    [reports],
  );

  const pastReports = useMemo(
    () =>
      reports.filter(
        (item) => item.periodType === "past" && item.status !== "archived",
      ),
    [reports],
  );

  const archivedReports = useMemo(
    () => reports.filter((item) => item.status === "archived"),
    [reports],
  );

  const visibleReports = useMemo(() => {
    if (activeTab === "current") return currentReports;
    if (activeTab === "past") return pastReports;
    return archivedReports;
  }, [activeTab, archivedReports, currentReports, pastReports]);

  function resetWorkspace(nextTab = activeTab) {
    setWorkspaceMode("idle");
    setSelectedReportId(null);
    setRemoveReportPdf(false);
    setSelectedPdfLabel("");
    setReportPdfError(null);
    if (reportPdfInputRef.current) {
      reportPdfInputRef.current.value = "";
    }
    setDraft(getEmptyDraft(nextTab, firstCategory));
  }

  function openCreateMode() {
    setSelectedReportId(null);
    setWorkspaceMode("create");
    setRemoveReportPdf(false);
    setSelectedPdfLabel("");
    setReportPdfError(null);
    if (reportPdfInputRef.current) {
      reportPdfInputRef.current.value = "";
    }
    setDraft(getEmptyDraft(activeTab, firstCategory));
  }

  function openEditMode(report: ReportItem) {
    setSelectedReportId(report.id);
    setWorkspaceMode("edit");
    setRemoveReportPdf(false);
    setSelectedPdfLabel("");
    setReportPdfError(null);
    if (reportPdfInputRef.current) {
      reportPdfInputRef.current.value = "";
    }
    setDraft({
      ...report,
      isPinned: Boolean(report.isPinned),
      isNew: Boolean(report.isNew),
      newUntil: report.newUntil ?? null,
      pdfFileName: report.pdfFileName ?? "",
      pdfPath: report.pdfPath ?? "",
      archivedAt: report.archivedAt ?? null,
    });
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setWorkspaceMode("idle");
    setSelectedReportId(null);
    setRemoveReportPdf(false);
    setSelectedPdfLabel("");
    setReportPdfError(null);
    if (reportPdfInputRef.current) {
      reportPdfInputRef.current.value = "";
    }
    setDraft(getEmptyDraft(tab, firstCategory));
  }

  const isPastContext = draft.periodType === "past";
  const isArchiveContext =
    activeTab === "archive" || draft.status === "archived";
  const isDraftLikeEdit =
    workspaceMode === "edit" && draft.status === "draft";
  const isPublishedEdit =
    workspaceMode === "edit" && draft.status === "active";

  const normalizedDraft: ReportItem = {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    reportDate: draft.reportDate,
    periodType: isPastContext ? "past" : "current",
    month: isPastContext ? undefined : draft.month ?? "",
    year: isPastContext ? draft.year ?? undefined : undefined,
    isPinned: isPastContext || isArchiveContext ? false : Boolean(draft.isPinned),
    isNew: isPastContext || isArchiveContext ? false : Boolean(draft.isNew),
    newUntil:
      isPastContext || isArchiveContext
        ? null
        : draft.isNew
          ? draft.newUntil ?? null
          : null,
    status:
      submitIntent === "publish"
        ? "active"
        : workspaceMode === "create"
          ? "draft"
          : draft.status,
    pdfFileName: draft.pdfFileName ?? "",
    pdfPath: draft.pdfPath ?? "",
    updatedAt: new Date().toISOString(),
    archivedAt:
      draft.status === "archived"
        ? draft.archivedAt ?? new Date().toISOString()
        : null,
  };

  const nextReportsPayload =
    workspaceMode === "idle"
      ? reports
      : submitIntent === "delete"
        ? reports
        : workspaceMode === "create"
          ? [normalizedDraft, ...reports]
          : reports.map((item) =>
              item.id === normalizedDraft.id ? normalizedDraft : item,
            );

  async function handleSubmit(formData: FormData) {
    setActionLabel(
      submitIntent === "delete"
        ? "Удаляем отчет..."
        : submitIntent === "publish"
          ? "Публикуем отчет..."
          : selectedPdfLabel
            ? "Загружаем и сохраняем PDF отчет..."
            : workspaceMode === "edit"
              ? "Обновляем отчет..."
              : "Создаем отчет...",
    );

    const file = formData.get("reportPdf");

    if (file && file instanceof File && file.size > 0) {
      const fileExt = file.name.split(".").pop() ?? "pdf";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${houseId}/${normalizedDraft.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("house-reports")
        .upload(filePath, file, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadError) {
        setActionLabel("Обрабатываем отчет...");
        return;
      }

      formData.delete("reportPdf");
      formData.set("uploadedPdfPath", filePath);
      formData.set("uploadedPdfName", file.name);
    }

    startTransition(async () => {
      await formAction(formData);
      router.refresh();
      resetWorkspace();
      setSubmitIntent("save");
      setActionLabel("Обрабатываем отчет...");
    });
  }

  function handleReportPdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedPdfLabel("");
      setReportPdfError(null);
      return;
    }

    const validation = validateSinglePdfFile(file);

    if (!validation.isValid) {
      setSelectedPdfLabel("");
      setReportPdfError(validation.error);
      event.target.value = "";
      return;
    }

    setReportPdfError(null);
    setSelectedPdfLabel(file.name);
    setRemoveReportPdf(false);
  }


  function handleDeleteAllArchived() {
    startDeleteArchiveTransition(async () => {
      const formData = new FormData();
      formData.set("sectionId", sectionId);
      formData.set("houseId", houseId);
      formData.set("houseSlug", houseSlug);
      formData.set("kind", "reports");
      formData.set("title", sectionTitle ?? "Отчеты");
      formData.set("status", getDefaultSectionStatus(sectionStatus));
      formData.set("reportAction", "delete_archive");
      formData.set(
        "reportsPayload",
        JSON.stringify({
          categoriesCatalog: categoryOptions,
          reports: [
            ...currentReports,
            ...pastReports,
            ...archivedReports,
          ],
        }),
      );

      await formAction(formData);
      setConfirmAction(null);
    });
  }

  const currentPdfLabel =
    selectedPdfLabel || draft.pdfFileName || "PDF пока не прикреплен";

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-3xl"
      />

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Реестр отчетов</h2>
            <p className="mt-2 text-sm text-slate-400">
              Управление финансовыми и операционными отчетами дома с публикацией для жильцов.
            </p>
          </div>

          {activeTab === "archive" ? (
            archivedReports.length > 0 ? (
              <button
                type="button"
                disabled={isDeletingArchive}
                onClick={() => setConfirmAction("delete_archive")}
                className="inline-flex items-center justify-center rounded-2xl border border-red-900 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
              >
                {isDeletingArchive
                  ? "Удаляем архив..."
                  : "Удалить все"}
              </button>
            ) : <div />
          ) : (
            <button
              type="button"
              onClick={openCreateMode}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Создать отчет
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {[
              ["current", "Текущий год", currentReports.length],
              ["past", "Прошлые годы", pastReports.length],
              ["archive", "Архив", archivedReports.length],
            ].map(([key, label, count]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key as TabKey)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "border border-slate-700 bg-slate-950/40 text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-slate-200 text-slate-950"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {workspaceMode !== "idle" ? (
        <form
          ref={formRef}
          action={handleSubmit}
          className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <input type="hidden" name="sectionId" value={sectionId} />
          <input type="hidden" name="houseId" value={houseId} />
          <input type="hidden" name="houseSlug" value={houseSlug} />
          <input type="hidden" name="kind" value="reports" />
          <input type="hidden" name="title" value={sectionTitle ?? "Отчеты"} />
          <input
            type="hidden"
            name="status"
            value={getDefaultSectionStatus(sectionStatus)}
          />
          <input
            type="hidden"
            name="activeReportId"
            value={normalizedDraft.id}
          />
          <input
            type="hidden"
            name="removeReportPdf"
            value={submitIntent === "delete" ? (draft.pdfPath ? "true" : "false") : removeReportPdf ? "true" : "false"}
          />
          <input type="hidden" name="reportAction" value={submitIntent} />
          <input
            type="hidden"
            name="reportsPayload"
            value={JSON.stringify({
              categoriesCatalog: categoryOptions,
              reports: nextReportsPayload,
            })}
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">
                {workspaceMode === "edit"
                  ? "Редактирование отчета"
                  : isPastContext
                    ? "Новый отчет за прошлый год"
                    : "Новый отчет текущего года"}
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Новый отчет создается как черновик. После сохранения карточку можно открыть повторно и опубликовать.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetWorkspace()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/40 text-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
              aria-label="Закрыть форму"
            >
              ×
            </button>
          </div>

          {state.error ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {state.error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">
                Заголовок
              </span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Например: Отчет о выполненных работах за апрель"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">
                Категория
              </span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-medium text-white">
                Краткое описание
              </span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Короткое описание отчета для карточки на public и в CMS."
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white">
                Дата отчета
              </span>
              <input
                type="date"
                value={draft.reportDate}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, reportDate: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
              />
            </label>

            {isPastContext ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">
                  Год
                </span>
                <select
                  value={String(draft.year ?? "")}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      year: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
                >
                  {Array.from({ length: 10 }, (_, index) => 2016 + index).map((item) => (
                    <option key={item} value={String(item)}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">
                  Месяц
                </span>
                <select
                  value={draft.month ?? ""}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, month: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
                >
                  <option value="">Выберите месяц</option>
                  {CURRENT_MONTH_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="xl:col-span-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-sm font-medium text-white">
                PDF файл отчета
              </div>

              <div className="mt-2 text-sm text-slate-400">
                {currentPdfLabel}
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-white">
                  Загрузить / заменить PDF
                </span>
                <input
                  ref={reportPdfInputRef}
                  key={`${workspaceMode}-${draft.id}`}
                  type="file"
                  name="reportPdf"
                  accept="application/pdf,.pdf"
                  onChange={handleReportPdfChange}
                  className="block w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />
              </label>

              <div className="mt-2 text-xs text-slate-500">
                {getSinglePdfHintMessage()}
              </div>

              {reportPdfError ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {reportPdfError}
                </div>
              ) : null}

            </div>
          </div>

          {!isPastContext && !isArchiveContext ? (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isPinned)}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        isPinned: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  Закрепить как важный отчет
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isNew)}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        isNew: event.target.checked,
                        newUntil: event.target.checked
                          ? prev.newUntil ??
                            new Date(
                              Date.now() + 14 * 24 * 60 * 60 * 1000,
                            ).toISOString().slice(0, 10)
                          : null,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                  />
                  Показывать как новый
                </label>
              </div>

              {draft.isNew ? (
                <label className="mt-4 block max-w-sm">
                  <span className="mb-2 block text-sm font-medium text-white">
                    Новый до
                  </span>
                  <input
                    type="date"
                    value={draft.newUntil ?? ""}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        newUntil: event.target.value || null,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-slate-500"
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <div className="overflow-x-auto">
            <div className="mt-6 flex min-w-max flex-nowrap items-end justify-between gap-6">
              <div className="flex flex-nowrap items-center gap-3">
                <button
                  type="button"
                  disabled={isPending || Boolean(reportPdfError)}
                  onClick={() => {
                    setSubmitIntent("save");
                    requestAnimationFrame(() => {
                      formRef.current?.requestSubmit();
                    });
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && submitIntent === "save" ? "Сохраняем..." : "Сохранить"}
                </button>

                {isDraftLikeEdit ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "delete" ? "Удаляем..." : "Удалить"}
                  </button>
                ) : null}
              </div>

              {isDraftLikeEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("publish")}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "publish" ? "Подтверждаем..." : "Подтвердить"}
                  </button>
                </div>
              ) : null}

              {isPublishedEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("archive")}
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-700 px-5 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-950/30 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "archive" ? "Архивируем..." : "Архивировать"}
                  </button>
                </div>
              ) : null}

              {workspaceMode === "edit" && draft.status === "archived" ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-2xl border border-red-900 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "delete" ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              ) : null}

            </div>
          </div>

          <PlatformConfirmModal
            open={confirmAction === "publish"}
            title="Подтвердить публикацию отчета?"
            description="После подтверждения отчет станет видимым для жильцов на сайте дома."
            confirmLabel="Подтвердить публикацию"
            pendingLabel="Подтверждаем..."
            tone="publish"
            isPending={isPending}
            onCancel={() => {
              if (!isPending) {
                setConfirmAction(null);
              }
            }}
            onConfirm={() => {
              setConfirmAction(null);
              setSubmitIntent("publish");
              requestAnimationFrame(() => {
                formRef.current?.requestSubmit();
              });
            }}
          />

          <PlatformConfirmModal
            open={confirmAction === "archive"}
            title="Перенести отчет в архив?"
            description="После архивации отчет исчезнет из публичной части сайта и перестанет быть видимым жильцам. В CMS он останется доступным в архиве."
            confirmLabel="Архивировать отчет"
            pendingLabel="Архивируем..."
            tone="warning"
            isPending={isPending}
            onCancel={() => {
              if (!isPending) {
                setConfirmAction(null);
              }
            }}
            onConfirm={() => {
              setConfirmAction(null);
              setSubmitIntent("archive");
              requestAnimationFrame(() => {
                formRef.current?.requestSubmit();
              });
            }}
          />

          <PlatformConfirmModal
            open={confirmAction === "delete"}
            title="Удалить черновик отчета?"
            description="Черновик отчета будет удален без возможности восстановления вместе с PDF файлом."
            confirmLabel="Удалить отчет"
            pendingLabel="Удаляем..."
            tone="destructive"
            isPending={isPending}
            onCancel={() => {
              if (!isPending) {
                setConfirmAction(null);
              }
            }}
            onConfirm={() => {
              setConfirmAction(null);
              setSubmitIntent("delete");
              requestAnimationFrame(() => {
                formRef.current?.requestSubmit();
              });
            }}
          />
        </form>
      ) : null}

      <PlatformConfirmModal
        open={confirmAction === "delete_archive"}
        title="Удалить все архивные отчеты?"
        description="Все архивные отчеты будут безвозвратно удалены вместе с PDF файлами. Восстановление после этого невозможно."
        confirmLabel="Удалить архив"
        pendingLabel="Удаляем архив..."
        tone="destructive"
        isPending={isDeletingArchive}
        onCancel={() => {
          if (!isPending) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          handleDeleteAllArchived();
        }}
      />

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="mt-0">
          {visibleReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-sm text-slate-400">
              {activeTab === "current"
                ? "Здесь будут отображаться отчеты текущего года после создания."
                : activeTab == "past"
                  ? "Здесь будут храниться отчеты за прошлые годы."
                  : "Архивные отчеты будут отображаться в этом разделе."}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => openEditMode(report)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedReportId === report.id && workspaceMode === "edit"
                      ? "border-white bg-slate-800"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-300">
                      {report.category}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getStatusBadgeClasses(
                        report.status,
                      )}`}
                    >
                      {getStatusLabel(report.status)}
                    </span>

                    {report.isPinned ? (
                      <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-red-300">
                        Важный
                      </span>
                    ) : null}

                    {report.isNew ? (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
                        Новый
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-lg font-semibold text-white">
                    {report.title}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {report.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
                    <span>{formatDate(report.reportDate)}</span>
                    {report.periodType === "current" ? (
                      <span>{getMonthLabel(report.month)}</span>
                    ) : (
                      <span>{report.year ?? "Год не указан"}</span>
                    )}
                    {report.pdfFileName ? <span>{report.pdfFileName}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
