"use client";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { startTransition, useActionState, useMemo, useRef, useState, useTransition } from "react";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
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
  { value: "01", label: "Січень" },
  { value: "02", label: "Лютий" },
  { value: "03", label: "Березень" },
  { value: "04", label: "Квітень" },
  { value: "05", label: "Травень" },
  { value: "06", label: "Червень" },
  { value: "07", label: "Липень" },
  { value: "08", label: "Серпень" },
  { value: "09", label: "Вересень" },
  { value: "10", label: "Жовтень" },
  { value: "11", label: "Листопад" },
  { value: "12", label: "Грудень" },
];

const DEFAULT_CATEGORIES = [
  "Виконані роботи",
  "Фінансовий звіт",
  "Ремонт та обслуговування",
  "Інженерні системи",
];

function createReportId() {
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value: string) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status: ReportStatus) {
  if (status === "active") return "Активна";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

function getStatusBadgeClasses(status: ReportStatus) {
  if (status === "active") {
    return "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (status === "archived") {
    return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)]";
  }

  return "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]";
}

function getMonthLabel(value: string | undefined) {
  if (!value) return "Місяць не вказано";

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
  const [actionLabel, setActionLabel] = useState("Обробляємо звіт...");
  const reportPdfInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const categoryOptions = useMemo(() => {
    const legacyReportCategoryMap: Record<string, string> = {
      "Выполненные работы": "Виконані роботи",
      "Финансовый отчет": "Фінансовий звіт",
      "Ремонт и обслуживание": "Ремонт та обслуговування",
      "Инженерные системы": "Інженерні системи",
    };

    const normalizeReportCategory = (value: string) => legacyReportCategoryMap[value.trim()] ?? value.trim();

    const dynamicCategories = reports
      .map((item) => normalizeReportCategory(item.category))
      .filter((item) => Boolean(item.trim()));

    return Array.from(
      new Set([
        ...DEFAULT_CATEGORIES,
        ...categoriesCatalog.map((item) => normalizeReportCategory(item)).filter((item) => item),
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
        ? "Видаляємо звіт..."
        : submitIntent === "publish"
          ? "Публікуємо звіт..."
          : selectedPdfLabel
            ? "Завантажуємо та зберігаємо PDF звіт..."
            : workspaceMode === "edit"
              ? "Оновлюємо звіт..."
              : "Створюємо звіт...",
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
        setActionLabel("Обробляємо звіт...");
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
      setActionLabel("Обробляємо звіт...");
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
      formData.set("title", sectionTitle ?? "Звіти");
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
    selectedPdfLabel || draft.pdfFileName || "PDF поки не прикріплено";

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-3xl"
      />

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--cms-text)]">Реєстр звітів</h2>
            <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
              Керування фінансовими та операційними звітами будинку з публікацією для мешканців.
            </p>
          </div>

          {activeTab === "archive" ? (
            archivedReports.length > 0 ? (
              <button
                type="button"
                disabled={isDeletingArchive}
                onClick={() => setConfirmAction("delete_archive")}
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-danger-border)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
              >
                {isDeletingArchive
                  ? "Видаляємо архів..."
                  : "Видалити все"}
              </button>
            ) : <div />
          ) : (
            <button
              type="button"
              onClick={openCreateMode}
              className={adminPrimaryButtonClass}
            >
              Створити звіт
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            {[
              ["current", "Поточний рік", currentReports.length],
              ["past", "Минулі роки", pastReports.length],
              ["archive", "Архів", archivedReports.length],
            ].map(([key, label, count]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key as TabKey)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                      : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)]"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]"
                        : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]"
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
          className={`${adminSurfaceClass} p-6`}
        >
          <input type="hidden" name="sectionId" value={sectionId} />
          <input type="hidden" name="houseId" value={houseId} />
          <input type="hidden" name="houseSlug" value={houseSlug} />
          <input type="hidden" name="kind" value="reports" />
          <input type="hidden" name="title" value={sectionTitle ?? "Звіти"} />
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
              <div className="text-lg font-semibold text-[var(--cms-text)]">
                {workspaceMode === "edit"
                  ? "Редагування звіту"
                  : isPastContext
                    ? "Новий звіт за минулий рік"
                    : "Новий звіт поточного року"}
              </div>

              <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                Новий звіт створюється як чернетка. Після збереження картку можна повторно відкрити та опублікувати.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetWorkspace()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-lg text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
              aria-label="Закрити форму"
            >
              ×
            </button>
          </div>

          {state.error ? (
            <div className="mt-5 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
              {state.error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <label className="block">
              <span className={`mb-2 block ${adminTextLabelClass}`}>
                Заголовок
              </span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Наприклад: Звіт про виконані роботи за квітень"
                className={adminInputClass}
              />
            </label>

            <label className="block">
              <span className={`mb-2 block ${adminTextLabelClass}`}>
                Категорія
              </span>
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, category: event.target.value }))
                }
                className={adminInputClass}
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block xl:col-span-2">
              <span className={`mb-2 block ${adminTextLabelClass}`}>
                Короткий опис
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
                placeholder="Короткий опис звіту для картки на public та в CMS."
                className={adminInputClass}
              />
            </label>

            <label className="block">
              <span className={`mb-2 block ${adminTextLabelClass}`}>
                Дата звіту
              </span>
              <input
                type="date"
                value={draft.reportDate}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, reportDate: event.target.value }))
                }
                className={adminInputClass}
              />
            </label>

            {isPastContext ? (
              <label className="block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Рік
                </span>
                <select
                  value={String(draft.year ?? "")}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      year: Number(event.target.value),
                    }))
                  }
                  className={adminInputClass}
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
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Місяць
                </span>
                <select
                  value={draft.month ?? ""}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, month: event.target.value }))
                  }
                  className={adminInputClass}
                >
                  <option value="">Оберіть місяць</option>
                  {CURRENT_MONTH_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="xl:col-span-2 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <div className="text-sm font-medium text-[var(--cms-text)]">
                PDF файл звіту
              </div>

              <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                {currentPdfLabel}
              </div>

              <label className="mt-4 block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Завантажити / замінити PDF
                </span>
                <input
                  ref={reportPdfInputRef}
                  key={`${workspaceMode}-${draft.id}`}
                  type="file"
                  name="reportPdf"
                  accept="application/pdf,.pdf"
                  onChange={handleReportPdfChange}
                  className="block w-full rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                />
              </label>

              <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
                {getSinglePdfHintMessage()}
              </div>

              {reportPdfError ? (
                <div className="mt-3 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                  {reportPdfError}
                </div>
              ) : null}

            </div>
          </div>

          {!isPastContext && !isArchiveContext ? (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.isPinned)}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        isPinned: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[var(--cms-border-strong)] bg-[var(--cms-surface)]"
                  />
                  Закріпити як важливий звіт
                </label>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]">
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
                    className="h-4 w-4 rounded border-[var(--cms-border-strong)] bg-[var(--cms-surface)]"
                  />
                  Показувати як новий
                </label>
              </div>

              {draft.isNew ? (
                <label className="mt-4 block max-w-sm">
                  <span className={`mb-2 block ${adminTextLabelClass}`}>
                    Новий до
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
                    className={adminInputClass}
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
                  className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isPending && submitIntent === "save" ? "Зберігаємо..." : "Зберегти"}
                </button>

                {isDraftLikeEdit ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:bg-red-500/15 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "delete" ? "Видаляємо..." : "Видалити"}
                  </button>
                ) : null}
              </div>

              {isDraftLikeEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("publish")}
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "publish" ? "Підтверджуємо..." : "Підтвердити"}
                  </button>
                </div>
              ) : null}

              {isPublishedEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("archive")}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-warning-border)] px-5 py-3 text-sm font-medium text-[var(--cms-warning-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "archive" ? "Архівуємо..." : "Архівувати"}
                  </button>
                </div>
              ) : null}

              {workspaceMode === "edit" && draft.status === "archived" ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-danger-border)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "delete" ? "Видаляємо..." : "Видалити"}
                  </button>
                </div>
              ) : null}

            </div>
          </div>

          <PlatformConfirmModal
            open={confirmAction === "publish"}
            title="Підтвердити публікацію звіту?"
            description="Після підтвердження звіт стане видимим для мешканців на сайті будинку."
            confirmLabel="Підтвердити публікацію"
            pendingLabel="Підтверджуємо..."
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
            title="Перенести звіт до архіву?"
            description="Після архівації звіт зникне з публічної частини сайту та перестане бути видимим мешканцям. У CMS він залишиться доступним в архіві."
            confirmLabel="Архівувати звіт"
            pendingLabel="Архівуємо..."
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
            title="Видалити чернетку звіту?"
            description="Чернетку звіту буде видалено без можливості відновлення разом із PDF файлом."
            confirmLabel="Видалити звіт"
            pendingLabel="Видаляємо..."
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
        title="Видалити всі архівні звіти?"
        description="Усі архівні звіти будуть безповоротно видалені разом із PDF файлами. Відновлення після цього неможливе."
        confirmLabel="Видалити архів"
        pendingLabel="Видаляємо архів..."
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

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="mt-0">
          {visibleReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 text-sm text-[var(--cms-text-muted)]">
              {activeTab === "current"
                ? "Тут відображатимуться звіти поточного року після створення."
                : activeTab == "past"
                  ? "Тут зберігатимуться звіти за минулі роки."
                  : "Архівні звіти відображатимуться в цьому розділі."}
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
                      ? "border-[var(--cms-border-strong)] bg-[var(--cms-surface)]"
                      : "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] hover:border-[var(--cms-border-strong)] hover:bg-[var(--cms-surface)]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-pill-bg)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-text-muted)]">
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
                      <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-danger-text)]">
                        Важливий
                      </span>
                    ) : null}

                    {report.isNew ? (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)]/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--cms-success-text)]">
                        Новий
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-lg font-semibold text-[var(--cms-text)]">
                    {report.title}
                  </div>

                  <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                    {report.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-[var(--cms-text-soft)]">
                    <span>{formatDate(report.reportDate)}</span>
                    {report.periodType === "current" ? (
                      <span>{getMonthLabel(report.month)}</span>
                    ) : (
                      <span>{report.year ?? "Рік не вказано"}</span>
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
