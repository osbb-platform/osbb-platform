"use client";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
} from "@/src/shared/utils/validators/pdfUpload";
import type {
  HouseReportCategorySnapshot,
  HouseReportSnapshot,
  HouseReportLifecycle,
  HouseReportPeriodType,
} from "@/src/modules/houses/services/getAdminHouseReports";

function createClientUploadId(prefix: string) {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "upload";

  return `${prefix}-${randomId}`;
}


type Props = {
  readOnlyMode?: boolean;
  houseId: string;
  reports: HouseReportSnapshot[];
  categories: HouseReportCategorySnapshot[];
  duplicateTargets?: CrossHouseDuplicateTarget[];
};

type TabKey = "current" | "past" | "draft" | "archive";
type WorkspaceMode = "idle" | "create" | "edit";
type ConfirmAction = "publish" | "archive" | "restore" | "delete" | "delete_archive" | null;
type SubmitIntent = "save" | "publish" | "archive" | "restore" | "delete" | "copy";
type ReportSortMode =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "year_desc"
  | "year_asc";

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

function normalizeReportCategory(value: string) {
  const map: Record<string, string> = {
    "Выполненные работы": "Виконані роботи",
    "Финансовый отчет": "Фінансовий звіт",
    "Ремонт и обслуживание": "Ремонт та обслуговування",
    "Инженерные системы": "Інженерні системи",
  };

  return map[value.trim()] ?? value.trim();
}

function getMonthLabel(value: string | null | undefined) {
  if (!value) return "Місяць не вказано";

  return (
    CURRENT_MONTH_OPTIONS.find((item) => item.value === value)?.label ?? value
  );
}

function formatDate(value: string | null) {
  if (!value) return "Дату не вказано";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дату не вказано";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(status: HouseReportLifecycle) {
  if (status === "published") return "Активна";
  if (status === "archived") return "Архів";
  return "Чернетка";
}

function getStatusBadgeClasses(status: HouseReportLifecycle) {
  if (status === "published") {
    return "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  }

  if (status === "archived") {
    return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)]";
  }

  return "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]";
}

function getDefaultYear(tab: TabKey) {
  const year = new Date().getFullYear();
  return tab === "past" ? year - 1 : year;
}

function getEmptyDraft(tab: TabKey, firstCategory: string) {
  const now = new Date().toISOString();

  return {
    title: "",
    description: "",
    categoryTitle: firstCategory,
    reportDate: "",
    periodType: tab === "past" ? "past" as HouseReportPeriodType : "current" as HouseReportPeriodType,
    month: tab === "past" ? "" : "",
    year: tab === "past" ? getDefaultYear(tab) : null as number | null,
    isPinned: false,
    isNew: false,
    newUntil: null as string | null,
    createdAt: now,
    updatedAt: now,
  };
}

function mapReportToDraft(report: HouseReportSnapshot) {
  return {
    title: report.title,
    description: report.description,
    categoryTitle: report.categoryTitle,
    reportDate: report.reportDate ?? "",
    periodType: report.periodType,
    month: report.month ?? "",
    year: report.year,
    isPinned: report.isPinned,
    isNew: report.isNew,
    newUntil: report.newUntil ? report.newUntil.slice(0, 10) : null,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function normalizeNewUntil(value: string | null, isNew: boolean) {
  if (!isNew) return null;
  return value?.trim() ? value : null;
}

type RawReportCommandResult = Partial<HouseReportSnapshot> & {
  lock_version?: number;
  period_type?: HouseReportPeriodType;
  lifecycle_status?: HouseReportLifecycle;
};

function getReportResultLockVersion(
  report: RawReportCommandResult | null,
  fallback: number,
) {
  if (typeof report?.lockVersion === "number") return report.lockVersion;
  if (typeof report?.lock_version === "number") return report.lock_version;
  return fallback;
}

function getReportResultPeriodType(
  report: RawReportCommandResult | null,
  fallback: HouseReportPeriodType,
) {
  return report?.periodType ?? report?.period_type ?? fallback;
}

function getReportResultLifecycleStatus(
  report: RawReportCommandResult | null,
  fallback: HouseReportLifecycle,
) {
  return report?.lifecycleStatus ?? report?.lifecycle_status ?? fallback;
}

export function HouseReportsWorkspace({
  readOnlyMode = false,
  houseId,
  reports,
  categories,
  duplicateTargets = [],
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const reportPdfInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("current");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [actionLabel, setActionLabel] = useState("Обробляємо звіт...");
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [reportSortMode, setReportSortMode] =
    useState<ReportSortMode>("updated_desc");
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [removeReportPdf, setRemoveReportPdf] = useState(false);
  const [reportPdfError, setReportPdfError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const fromCategories = categories.map((item) => normalizeReportCategory(item.title));
    const fromReports = reports
      .map((item) => normalizeReportCategory(item.categoryTitle))
      .filter(Boolean);

    return Array.from(
      new Set([
        ...DEFAULT_CATEGORIES,
        ...fromCategories,
        ...fromReports,
      ].filter(Boolean)),
    );
  }, [categories, reports]);

  const firstCategory = categoryOptions[0] ?? DEFAULT_CATEGORIES[0];

  const [draft, setDraft] = useState(() =>
    getEmptyDraft("current", firstCategory),
  );

  const selectedReport = useMemo(
    () =>
      selectedReportId
        ? reports.find((report) => report.id === selectedReportId) ?? null
        : null,
    [reports, selectedReportId],
  );

  const currentReports = useMemo(
    () =>
      reports.filter(
        (item) =>
          item.periodType === "current" &&
          item.lifecycleStatus === "published",
      ),
    [reports],
  );

  const pastReports = useMemo(
    () =>
      reports.filter(
        (item) =>
          item.periodType === "past" &&
          item.lifecycleStatus === "published",
      ),
    [reports],
  );

  const draftReports = useMemo(
    () => reports.filter((item) => item.lifecycleStatus === "draft"),
    [reports],
  );

  const archivedReports = useMemo(
    () => reports.filter((item) => item.lifecycleStatus === "archived"),
    [reports],
  );

  const baseVisibleReports = useMemo(() => {
    if (activeTab === "current") return currentReports;
    if (activeTab === "past") return pastReports;
    if (activeTab === "draft") return draftReports;
    return archivedReports;
  }, [activeTab, archivedReports, currentReports, draftReports, pastReports]);

  const visibleReports = useMemo(() => {
    const normalizedQuery = reportSearchQuery.trim().toLowerCase();

    const filtered = baseVisibleReports.filter((report) => {
      if (!normalizedQuery) return true;

      return [
        report.title,
        report.description,
        report.categoryTitle,
        report.pdf?.originalName,
        report.year ? String(report.year) : "",
        report.month ? getMonthLabel(report.month) : "",
        report.reportDate ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return filtered.slice().sort((left, right) => {
      if (reportSortMode === "title_asc") {
        return left.title.localeCompare(right.title, "uk", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (reportSortMode === "title_desc") {
        return right.title.localeCompare(left.title, "uk", {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (reportSortMode === "year_desc") {
        return Number(right.year ?? 0) - Number(left.year ?? 0);
      }

      if (reportSortMode === "year_asc") {
        return Number(left.year ?? 0) - Number(right.year ?? 0);
      }

      if (reportSortMode === "updated_asc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [baseVisibleReports, reportSearchQuery, reportSortMode]);

  const isPastContext = draft.periodType === "past";
  const isArchiveContext = selectedReport?.lifecycleStatus === "archived";
  const isDraftLikeEdit =
    workspaceMode === "edit" && selectedReport?.lifecycleStatus === "draft";
  const isPublishedEdit =
    workspaceMode === "edit" && selectedReport?.lifecycleStatus === "published";
  const isArchivedEdit =
    workspaceMode === "edit" && selectedReport?.lifecycleStatus === "archived";

  const currentPdfLabel =
    selectedPdf?.name ||
    selectedReport?.pdf?.originalName ||
    "PDF поки не прикріплено";

  function resetPdfInput() {
    setSelectedPdf(null);
    setRemoveReportPdf(false);
    setReportPdfError(null);

    if (reportPdfInputRef.current) {
      reportPdfInputRef.current.value = "";
    }
  }

  function resetWorkspace(nextTab = activeTab) {
    setWorkspaceMode("idle");
    setSelectedReportId(null);
    setConfirmAction(null);
    setSubmitIntent("save");
    setActionLabel("Обробляємо звіт...");
    setActionError(null);
    resetPdfInput();
    setDraft(getEmptyDraft(nextTab, firstCategory));
  }

  function openCreateMode() {
    setActiveTab("draft");
    setSelectedReportId(null);
    setWorkspaceMode("create");
    setActionError(null);
    resetPdfInput();
    setDraft(getEmptyDraft(activeTab === "past" ? "past" : "current", firstCategory));
  }

  function openEditMode(report: HouseReportSnapshot) {
    setSelectedReportId(report.id);
    setWorkspaceMode("edit");
    setActionError(null);
    resetPdfInput();
    setDraft(mapReportToDraft(report));
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    setWorkspaceMode("idle");
    setSelectedReportId(null);
    setConfirmAction(null);
    setActionError(null);
    resetPdfInput();
    setDraft(getEmptyDraft(tab, firstCategory));
  }

  function handleReportPdfChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedPdf(null);
      setReportPdfError(null);
      return;
    }

    const validation = validateSinglePdfFile(file);

    if (!validation.isValid) {
      setSelectedPdf(null);
      setReportPdfError(validation.error);
      event.target.value = "";
      return;
    }

    setReportPdfError(null);
    setSelectedPdf(file);
    setRemoveReportPdf(false);
  }

  async function uploadSelectedPdf(targetId: string) {
    if (!selectedPdf) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();
    const fileExt = selectedPdf.name.split(".").pop() ?? "pdf";
    const fileName = `${createClientUploadId("report")}.${fileExt}`;
    const filePath = `${houseId}/reports/${targetId}/${fileName}`;

    const { error } = await supabase.storage
      .from("house-reports")
      .upload(filePath, selectedPdf, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (error) {
      console.error("House report PDF upload error:", error);
      throw new Error(
        "Не вдалося завантажити PDF. Якщо сесія завершилась, увійдіть в адмінку ще раз і повторіть дію.",
      );
    }

    return {
      bucket: "house-reports",
      path: filePath,
      originalName: selectedPdf.name,
      mimeType: "application/pdf",
      size: selectedPdf.size,
    };
  }

  function buildPayload(pdf: Awaited<ReturnType<typeof uploadSelectedPdf>>) {
    return {
      title: draft.title,
      description: draft.description,
      categoryTitle: normalizeReportCategory(draft.categoryTitle),
      reportDate: draft.reportDate || null,
      periodType: draft.periodType,
      month: draft.periodType === "current" ? draft.month || null : null,
      year: draft.periodType === "past" ? draft.year : null,
      isPinned:
        draft.periodType === "current" &&
        !isArchiveContext &&
        Boolean(draft.isPinned),
      isNew:
        draft.periodType === "current" &&
        !isArchiveContext &&
        Boolean(draft.isNew),
      newUntil:
        draft.periodType === "current"
          ? normalizeNewUntil(draft.newUntil, Boolean(draft.isNew))
          : null,
      pdf,
      removePdf: removeReportPdf,
    };
  }

  async function submitReport(intent: SubmitIntent) {
    setActionError(null);
    setSubmitIntent(intent);
    setActionLabel(
      intent === "delete"
        ? "Видаляємо звіт..."
        : intent === "publish"
          ? "Публікуємо звіт..."
          : intent === "archive"
            ? "Архівуємо звіт..."
            : intent === "restore"
              ? "Відновлюємо звіт..."
              : selectedPdf
                ? "Завантажуємо та зберігаємо PDF звіт..."
                : workspaceMode === "edit"
                  ? "Оновлюємо звіт..."
                  : "Створюємо звіт...",
    );

    try {
      if (intent === "delete") {
        if (!selectedReport) return;

        const result = await dispatch<HouseReportSnapshot>(
          {
            type: "reports.delete",
            houseId,
            payload: {
              id: selectedReport.id,
              lockVersion: selectedReport.lockVersion,
            },
          },
          { onError: setActionError },
        );

        if (!result) return;
        resetWorkspace("draft");
        return;
      }

      if (intent === "restore") {
        if (!selectedReport) return;

        const restored = await dispatch<HouseReportSnapshot>(
          {
            type: "reports.restore",
            houseId,
            payload: {
              id: selectedReport.id,
              lockVersion: selectedReport.lockVersion,
            },
          },
          { onError: setActionError },
        );

        if (!restored) return;
        resetWorkspace("draft");
        return;
      }

      const uploadTargetId = selectedReport?.id ?? createClientUploadId("new");
      const uploadedPdf = await uploadSelectedPdf(uploadTargetId);

      if (workspaceMode === "create") {
        const created = await dispatch<HouseReportSnapshot>(
          {
            type: "reports.create",
            houseId,
            payload: buildPayload(uploadedPdf),
          },
          { onError: setActionError },
        );

        if (!created) return;

        if (intent === "publish") {
          const published = await dispatch<HouseReportSnapshot>(
            {
              type: "reports.publish",
              houseId,
              payload: {
                id: created.id,
                lockVersion: getReportResultLockVersion(created, 1),
              },
            },
            { onError: setActionError },
          );

          if (!published) return;
          resetWorkspace(getReportResultPeriodType(created, "current") === "past" ? "past" : "current");
          return;
        }

        resetWorkspace("draft");
        return;
      }

      if (!selectedReport) return;

      const updated = await dispatch<HouseReportSnapshot>(
        {
          type: "reports.update",
          houseId,
          payload: {
            id: selectedReport.id,
            lockVersion: selectedReport.lockVersion,
            ...buildPayload(uploadedPdf),
          },
        },
        { onError: setActionError },
      );

      if (!updated) return;

      if (intent === "publish" || intent === "archive") {
        const nextType =
          intent === "publish" ? "reports.publish" : "reports.archive";

        const lifecycleResult = await dispatch<HouseReportSnapshot>(
          {
            type: nextType,
            houseId,
            payload: {
              id: updated.id,
              lockVersion: getReportResultLockVersion(updated, selectedReport.lockVersion + 1),
            },
          },
          { onError: setActionError },
        );

        if (!lifecycleResult) return;

        resetWorkspace(
          intent === "publish"
            ? getReportResultPeriodType(updated, selectedReport.periodType) === "past"
              ? "past"
              : "current"
            : "archive",
        );
        return;
      }

      resetWorkspace(
        getReportResultLifecycleStatus(updated, selectedReport.lifecycleStatus) === "published"
          ? getReportResultPeriodType(updated, selectedReport.periodType) === "past"
            ? "past"
            : "current"
          : getReportResultLifecycleStatus(updated, selectedReport.lifecycleStatus) === "archived"
            ? "archive"
            : "draft",
      );
    } catch (error) {
      console.error("House report submit error:", error);
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося виконати дію зі звітом. Оновіть сторінку і повторіть дію.",
      );
    }
  }

  async function handleDeleteAllArchived() {
    setActionError(null);
    setActionLabel("Видаляємо архів звітів...");
    setSubmitIntent("delete");

    const result = await dispatch(
      {
        type: "reports.deleteAllArchived",
        houseId,
        payload: {},
      },
      { onError: setActionError },
    );

    if (!result) return;
    setConfirmAction(null);
    resetWorkspace("archive");
  }

  async function copySelectedReportToDraft() {
    if (!selectedReport) return;

    setActionError(null);
    setSubmitIntent("copy");
    setActionLabel("Копіюємо звіт у чернетку...");

    const copied = await dispatch(
      {
        type: "reports.duplicate",
        houseId,
        payload: {
          sourceId: selectedReport.id,
          targetHouseIds: [houseId],
        },
      },
      { onError: setActionError },
    );

    if (!copied) return;

    resetWorkspace("draft");
    setActiveTab("draft");
  }

  async function handleCategoriesSync() {
    setActionError(null);
    setActionLabel("Оновлюємо каталог категорій...");

    const result = await dispatch(
      {
        type: "reports.categoriesUpsert",
        houseId,
        payload: {
          categories: categoryOptions.map((title, index) => ({
            title,
            sortOrder: index,
          })),
        },
      },
      { onError: setActionError },
    );

    if (!result) return;
    setActionLabel("Обробляємо звіт...");
  }

  return (
    <div className="relative space-y-6">
      <PlatformSectionLoader
        active={isPending}
        delayMs={280}
        label={actionLabel}
        className="rounded-[var(--r-xl)]"
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
            archivedReports.length > 0 && !readOnlyMode ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setConfirmAction("delete_archive")}
                className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
              >
                {isPending && submitIntent === "delete"
                  ? "Видаляємо архів..."
                  : "Видалити все"}
              </button>
            ) : <div />
          ) : (
            <button
              type="button"
              onClick={openCreateMode}
              disabled={readOnlyMode || isPending}
              className={`${adminPrimaryButtonClass} disabled:opacity-60`}
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
              ["draft", "Чернетки", draftReports.length],
              ["archive", "Архів", archivedReports.length],
            ].map(([key, label, count]) => {
              const isActive = activeTab === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTabChange(key as TabKey)}
                  className={`inline-flex items-center gap-3 rounded-[var(--r-lg)] px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                      : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)]"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-semibold ${
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

          <button
            type="button"
            disabled={readOnlyMode || isPending}
            onClick={() => void handleCategoriesSync()}
            className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)] disabled:opacity-60"
          >
            Синхронізувати категорії
          </button>
        </div>
      </div>

      {workspaceMode !== "idle" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport("save");
          }}
          className={`${adminSurfaceClass} p-6`}
        >
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

            <div className="flex shrink-0 items-center gap-2">
              {workspaceMode === "edit" && (isPublishedEdit || isArchivedEdit) && selectedReport ? (
                <ContentWorkspaceActionButtons
                  houseId={houseId}
                  sourceId={selectedReport.id}
                  commandType="reports.duplicate"
                  duplicateTargets={duplicateTargets}
                  disabled={readOnlyMode || isPending}
                  isCopying={isPending && submitIntent === "copy"}
                  onCopy={copySelectedReportToDraft}
                  duplicatePanelTitle="Копії звіту в інші будинки"
                />
              ) : null}

              <button
                type="button"
                onClick={() => resetWorkspace()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-lg text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
                aria-label="Закрити форму"
              >
                ×
              </button>
            </div>
          </div>

          {actionError || lastError ? (
            <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
              {actionError ?? lastError}
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
                value={draft.categoryTitle}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    categoryTitle: event.target.value,
                  }))
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

            <label className="block">
              <span className={`mb-2 block ${adminTextLabelClass}`}>
                Тип періоду
              </span>
              <select
                value={draft.periodType}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    periodType: event.target.value as HouseReportPeriodType,
                    year:
                      event.target.value === "past"
                        ? prev.year ?? getDefaultYear("past")
                        : null,
                  }))
                }
                className={adminInputClass}
              >
                <option value="current">Поточний рік</option>
                <option value="past">Минулий рік / архів років</option>
              </select>
            </label>

            {isPastContext ? (
              <label className="block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Рік
                </span>
                <select
                  value={String(draft.year ?? getDefaultYear("past"))}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      year: Number(event.target.value),
                    }))
                  }
                  className={adminInputClass}
                >
                  {Array.from({ length: 11 }, (_, index) => 2026 - index).map((item) => (
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

            <div className="xl:col-span-2 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <div className="text-sm font-medium text-[var(--cms-text)]">
                PDF файл звіту
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--cms-text-soft)]">
                    Поточний файл
                  </div>
                  <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
                    {removeReportPdf ? "PDF буде видалено після збереження" : currentPdfLabel}
                  </div>
                </div>

                {selectedReport?.pdf?.path && !removeReportPdf ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveReportPdf(true);
                      setSelectedPdf(null);
                      setReportPdfError(null);
                      if (reportPdfInputRef.current) {
                        reportPdfInputRef.current.value = "";
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-danger-border)] px-4 py-2 text-sm font-medium text-[var(--cms-danger-text)] transition hover:bg-[var(--cms-danger-bg)] disabled:opacity-60"
                  >
                    Видалити PDF
                  </button>
                ) : null}
              </div>

              {removeReportPdf ? (
                <div className="mt-3 rounded-[var(--r-lg)] border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] px-4 py-3 text-sm text-[var(--cms-warning-text)]">
                  Файл буде відʼєднано від звіту після натискання «Зберегти».
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Завантажити / замінити PDF
                </span>
                <input
                  ref={reportPdfInputRef}
                  key={`${workspaceMode}-${selectedReportId ?? "new"}`}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleReportPdfChange}
                  className="block w-full rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)] file:mr-4 file:rounded-[var(--r-sm)] file:border-0 file:bg-[var(--cms-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--cms-primary-contrast)]"
                />
              </label>

              <div className="mt-2 text-xs text-[var(--cms-text-soft)]">
                {getSinglePdfHintMessage()}
              </div>

              {reportPdfError ? (
                <div className="mt-3 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
                  {reportPdfError}
                </div>
              ) : null}
            </div>
          </div>

          {!isPastContext && !isArchiveContext ? (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]">
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

                <label className="inline-flex items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-4 py-3 text-sm text-[var(--cms-text)]">
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
                  type="submit"
                  disabled={readOnlyMode || isPending || Boolean(reportPdfError)}
                  className={`${adminPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isPending && submitIntent === "save" ? "Зберігаємо..." : "Зберегти"}
                </button>

                {isDraftLikeEdit ? (
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "delete" ? "Видаляємо..." : "Видалити"}
                  </button>
                ) : null}
              </div>

              {isDraftLikeEdit || workspaceMode === "create" ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("publish")}
                    className="inline-flex items-center justify-center rounded-[var(--r-lg)] bg-[var(--cms-success-bg)] border border-[var(--cms-success-border)] px-5 py-3 text-sm font-medium text-[var(--cms-success-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && submitIntent === "publish" ? "Підтверджуємо..." : "Підтвердити"}
                  </button>
                </div>
              ) : null}

              {isPublishedEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("archive")}
                    className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] px-5 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)] disabled:opacity-60"
                  >
                    {isPending && submitIntent === "archive" ? "Архівуємо..." : "В архів"}
                  </button>
                </div>
              ) : null}

              {isArchivedEdit ? (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending}
                    onClick={() => setConfirmAction("restore")}
                    className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] px-5 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)] disabled:opacity-60"
                  >
                    Відновити
                  </button>
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending}
                    onClick={() => setConfirmAction("delete")}
                    className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-5 py-3 text-sm font-medium text-[var(--cms-danger-text)] transition hover:opacity-90 disabled:opacity-60"
                  >
                    Видалити
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </form>
      ) : null}

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--cms-text)]">
              {activeTab === "current"
                ? "Поточний рік"
                : activeTab === "past"
                  ? "Минулі роки"
                  : activeTab === "draft"
                    ? "Чернетки"
                    : "Архів"}
            </h3>
            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              Відкрий картку для редагування, публікації або архівації.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={reportSearchQuery}
              onChange={(event) => setReportSearchQuery(event.target.value)}
              placeholder="Пошук за назвою, категорією, роком..."
              className={`${adminInputClass} sm:w-80`}
            />
            <select
              value={reportSortMode}
              onChange={(event) =>
                setReportSortMode(event.target.value as ReportSortMode)
              }
              className={adminInputClass}
            >
              <option value="updated_desc">Новіші оновлення</option>
              <option value="updated_asc">Старіші оновлення</option>
              <option value="title_asc">Назва А-Я</option>
              <option value="title_desc">Назва Я-А</option>
              <option value="year_desc">Рік ↓</option>
              <option value="year_asc">Рік ↑</option>
            </select>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <div className="mt-6 rounded-[var(--r-lg)] border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-6 text-sm text-[var(--cms-text-muted)]">
            У цьому списку поки немає звітів.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {visibleReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => openEditMode(report)}
                className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--cms-border-strong)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getStatusBadgeClasses(report.lifecycleStatus)}>
                    <span className="inline-flex rounded-[var(--r-pill)] px-3 py-1 text-xs font-medium">
                      {getStatusLabel(report.lifecycleStatus)}
                    </span>
                  </span>
                  <span className="rounded-[var(--r-pill)] bg-[var(--cms-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                    {normalizeReportCategory(report.categoryTitle) || "Без категорії"}
                  </span>
                  {report.isPinned ? (
                    <span className="rounded-[var(--r-pill)] bg-[var(--cms-warning-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-warning-text)]">
                      Важливе
                    </span>
                  ) : null}
                  {report.isNew ? (
                    <span className="rounded-[var(--r-pill)] bg-[var(--cms-success-bg)] px-3 py-1 text-xs font-medium text-[var(--cms-success-text)]">
                      Нове
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 text-lg font-semibold text-[var(--cms-text)]">
                  {report.title || "Без назви"}
                </div>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--cms-text-muted)]">
                  {report.description || "Опис не додано."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--cms-text-soft)]">
                  <span>{formatDate(report.reportDate)}</span>
                  <span>·</span>
                  <span>
                    {report.periodType === "past"
                      ? report.year ?? "Рік не вказано"
                      : getMonthLabel(report.month)}
                  </span>
                  <span>·</span>
                  <span>{report.pdf ? report.pdf.originalName ?? "PDF додано" : "PDF не додано"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Опублікувати звіт?"
        description="Після підтвердження звіт стане доступним мешканцям на публічній сторінці."
        confirmLabel="Підтвердити"
        tone="publish"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitReport("publish");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перемістити звіт в архів?"
        description="Звіт буде прихований з основного списку, але залишиться доступним в архіві CMS."
        confirmLabel="В архів"
        tone="warning"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitReport("archive");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "restore"}
        title="Відновити звіт?"
        description="Звіт повернеться у чернетки, після чого його можна буде повторно опублікувати."
        confirmLabel="Відновити"
        tone="warning"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitReport("restore");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title="Видалити звіт?"
        description="Цю дію не можна буде скасувати. Повʼязаний PDF також буде відʼєднано."
        confirmLabel="Видалити"
        tone="destructive"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void submitReport("delete");
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "delete_archive"}
        title="Видалити всі архівні звіти?"
        description="Архівні звіти та повʼязані PDF-файли будуть видалені з поточного списку."
        confirmLabel="Видалити все"
        tone="destructive"
        isPending={isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void handleDeleteAllArchived()}
      />
    </div>
  );
}
