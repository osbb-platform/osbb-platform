"use client";

import { useWorkspaceMemory } from "@/src/shared/hooks/useWorkspaceMemory";
import { WorkspacePaginationControls } from "@/src/modules/houses/components/WorkspacePaginationControls";
import { WorkspaceViewToggle, type WorkspaceViewMode } from "@/src/modules/houses/components/WorkspaceViewToggle";
import { WorkspaceQuickActions } from "@/src/modules/houses/components/WorkspaceQuickActions";

import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { useDirtyGuard } from "@/src/shared/hooks/useDirtyGuard";

import { AdminStatusBadge,
  statusLabelFor,
  statusToneFor } from "@/src/shared/ui/admin/AdminStatusBadge";

import { formatAdminDate } from "@/src/shared/utils/format/formatAdminDate";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";

import { useMemo,
  useRef,
  useState } from "react";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { PlatformSectionLoader } from "@/src/modules/cms/components/PlatformSectionLoader";
import { FileDropzone } from "@/src/shared/ui/admin/FileDropzone";
import {
  adminInputClass,
  adminSurfaceClass,
  adminTextLabelClass,
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";
import {
  getSinglePdfHintMessage,
  validateSinglePdfFile,
} from "@/src/shared/utils/validators/pdfUpload";
import {
  countAdminReportsByKind,
  filterAdminReportsByNavigation,
  getAdminReportPeriodYear,
  getAdminReportYears,
  type AdminReportPeriodKind,
} from "@/src/modules/houses/utils/adminReportNavigation";
import type {
  HouseReportCategorySnapshot,
  HouseReportSnapshot,
  HouseReportLifecycle,
  HouseReportPeriodType,
} from "@/src/modules/houses/services/getAdminHouseReports";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

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

type TabKey = "published" | "draft" | "archive";
type PublishedPeriodScope = "latest" | "none" | `year:${number}`;
type DraftPeriodContext = "current" | "past";
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

type HouseReportPeriodKind = "none" | "month" | "quarter" | "year";

type ReportPeriodDraft = {
  periodKind: HouseReportPeriodKind;
  periodMonth: string;
  periodQuarter: string;
  periodYear: number | null;
};

type HouseReportSnapshotWithPeriod = HouseReportSnapshot & {
  periodKind?: HouseReportPeriodKind | null;
  periodMonth?: number | null;
  periodQuarter?: number | null;
  periodYear?: number | null;
  period_kind?: HouseReportPeriodKind | null;
  period_month?: number | null;
  period_quarter?: number | null;
  period_year?: number | null;
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

const QUARTER_OPTIONS = [
  { value: "1", label: "I квартал" },
  { value: "2", label: "II квартал" },
  { value: "3", label: "III квартал" },
  { value: "4", label: "IV квартал" },
];

const PERIOD_KIND_OPTIONS: Array<{
  value: HouseReportPeriodKind;
  label: string;
}> = [
  { value: "none", label: "Без періоду" },
  { value: "month", label: "Місяць" },
  { value: "quarter", label: "Квартал" },
  { value: "year", label: "Рік" },
];

const REPORT_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() + 1 - 2000 + 1 },
  (_, index) => new Date().getFullYear() + 1 - index,
);

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

function isReportPeriodKind(value: unknown): value is HouseReportPeriodKind {
  return (
    value === "none" ||
    value === "month" ||
    value === "quarter" ||
    value === "year"
  );
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function formatMonthValue(value: unknown) {
  const month = readNumber(value);
  if (!month || month < 1 || month > 12) return "";

  return String(month).padStart(2, "0");
}

function getQuarterLabel(value: string | number | null | undefined) {
  const quarter = String(readNumber(value) ?? "");
  return (
    QUARTER_OPTIONS.find((item) => item.value === quarter)?.label ??
    "Квартал не вказано"
  );
}

function getDefaultYear(tab: DraftPeriodContext) {
  const year = new Date().getFullYear();
  return tab === "past" ? year - 1 : year;
}

function getLegacyPeriodType(
  periodKind: HouseReportPeriodKind,
  periodYear: number | null,
): HouseReportPeriodType {
  if (periodKind === "none" || periodYear === null) {
    return "current";
  }

  return periodYear < new Date().getFullYear() ? "past" : "current";
}

function getDefaultPeriodKind(tab: DraftPeriodContext): HouseReportPeriodKind {
  return tab === "past" ? "year" : "month";
}

function getEmptyPeriodDraft(tab: DraftPeriodContext): ReportPeriodDraft {
  const periodKind = getDefaultPeriodKind(tab);

  return {
    periodKind,
    periodMonth: "",
    periodQuarter: "1",
    periodYear: periodKind === "none" ? null : getDefaultYear(tab),
  };
}

function getEmptyDraft(tab: DraftPeriodContext, firstCategory: string) {
  const now = new Date().toISOString();
  const period = getEmptyPeriodDraft(tab);

  return {
    title: "",
    description: "",
    categoryTitle: firstCategory,
    reportDate: "",
    periodType: getLegacyPeriodType(period.periodKind, period.periodYear),
    periodKind: period.periodKind,
    periodMonth: period.periodMonth,
    periodQuarter: period.periodQuarter,
    periodYear: period.periodYear,
    month: period.periodMonth,
    year: period.periodYear,
    isPinned: false,
    isNew: false,
    newUntil: null as string | null,
    createdAt: now,
    updatedAt: now,
  };
}

type ReportDraft = ReturnType<typeof getEmptyDraft>;

function getReportPeriodDraft(report: HouseReportSnapshot): ReportPeriodDraft {
  const snapshot = report as HouseReportSnapshotWithPeriod;
  const explicitKind = snapshot.periodKind ?? snapshot.period_kind;

  if (isReportPeriodKind(explicitKind)) {
    const explicitYear =
      readNumber(snapshot.periodYear ?? snapshot.period_year) ??
      report.year ??
      null;

    return {
      periodKind: explicitKind,
      periodMonth:
        explicitKind === "month"
          ? formatMonthValue(snapshot.periodMonth ?? snapshot.period_month ?? report.month)
          : "",
      periodQuarter:
        explicitKind === "quarter"
          ? String(readNumber(snapshot.periodQuarter ?? snapshot.period_quarter) ?? 1)
          : "1",
      periodYear: explicitKind === "none" ? null : explicitYear,
    };
  }

  if (report.periodType === "past" && report.year) {
    return {
      periodKind: "year",
      periodMonth: "",
      periodQuarter: "1",
      periodYear: report.year,
    };
  }

  if (report.periodType === "current" && report.month && report.year) {
    return {
      periodKind: "month",
      periodMonth: formatMonthValue(report.month),
      periodQuarter: "1",
      periodYear: report.year,
    };
  }

  return {
    periodKind: "none",
    periodMonth: "",
    periodQuarter: "1",
    periodYear: null,
  };
}

function mapReportToDraft(report: HouseReportSnapshot) {
  const period = getReportPeriodDraft(report);

  return {
    title: report.title,
    description: report.description,
    categoryTitle: report.categoryTitle,
    reportDate: report.reportDate ?? "",
    periodType: getLegacyPeriodType(period.periodKind, period.periodYear),
    periodKind: period.periodKind,
    periodMonth: period.periodMonth,
    periodQuarter: period.periodQuarter,
    periodYear: period.periodYear,
    month: period.periodMonth,
    year: period.periodYear,
    isPinned: report.isPinned,
    isNew: report.isNew,
    newUntil: report.newUntil ? report.newUntil.slice(0, 10) : null,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

function buildDraftPeriodPayload(draft: ReportDraft) {
  if (draft.periodKind === "month") {
    return {
      kind: "month",
      month: draft.periodMonth || null,
      year: draft.periodYear,
    };
  }

  if (draft.periodKind === "quarter") {
    return {
      kind: "quarter",
      quarter: draft.periodQuarter || null,
      year: draft.periodYear,
    };
  }

  if (draft.periodKind === "year") {
    return {
      kind: "year",
      year: draft.periodYear,
    };
  }

  return {
    kind: "none",
  };
}

function getDraftTab(draft: ReportDraft): DraftPeriodContext {
  return draft.periodKind === "quarter" || draft.periodKind === "year"
    ? "past"
    : "current";
}

function formatReportPeriodLabel(report: HouseReportSnapshot) {
  const period = getReportPeriodDraft(report);

  if (period.periodKind === "month") {
    return `${getMonthLabel(period.periodMonth)} ${period.periodYear ?? ""}`.trim();
  }

  if (period.periodKind === "quarter") {
    return `${getQuarterLabel(period.periodQuarter)} ${period.periodYear ?? ""}`.trim();
  }

  if (period.periodKind === "year") {
    return period.periodYear ?? "Рік не вказано";
  }

  return "Без періоду";
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
  const { dispatch, isPending } = useAdminContentCommand();
  const reportPdfInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useWorkspaceMemory<TabKey>(
    "reports",
    "activeTab",
    "published",
    ["published", "draft", "archive"],
  );
  const [publishedPeriodScope, setPublishedPeriodScope] =
    useWorkspaceMemory<string>(
      "reports",
      "periodScope",
      "latest",
    );
  const [publishedPeriodKind, setPublishedPeriodKind] =
    useWorkspaceMemory<AdminReportPeriodKind>(
      "reports",
      "periodKind",
      "month",
      ["month", "quarter", "year"],
    );
  const [publishedMonthFilter, setPublishedMonthFilter] =
    useWorkspaceMemory("reports", "periodMonth", "all");
  const [publishedQuarterFilter, setPublishedQuarterFilter] =
    useWorkspaceMemory("reports", "periodQuarter", "all");
  const [publishedCategoryFilter, setPublishedCategoryFilter] =
    useWorkspaceMemory("reports", "categoryFilter", "all");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("idle");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>("save");
  const [actionLabel, setActionLabel] = useState("Обробляємо звіт...");
  const [reportSearchQuery, setReportSearchQuery] =
    useWorkspaceMemory("reports", "searchQuery", "");
  const [viewMode, setViewMode] = useWorkspaceMemory<WorkspaceViewMode>(
    "reports",
    "viewMode",
    "rows",
    ["rows", "grid"],
  );
  const [visibleReportCount, setVisibleReportCount] = useState(20);
  const [reportSortMode, setReportSortMode] =
    useWorkspaceMemory<ReportSortMode>(
      "reports",
      "sortMode",
      "updated_desc",
      [
        "updated_desc",
        "updated_asc",
        "title_asc",
        "title_desc",
        "year_desc",
        "year_asc",
      ],
    );
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [removeReportPdf, setRemoveReportPdf] = useState(false);
  const [reportPdfError, setReportPdfError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [panelDirty, setPanelDirty] = useState(false);
  const dirtyGuard = useDirtyGuard({ isDirty: panelDirty });

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

  const publishedReports = useMemo(
    () => reports.filter((item) => item.lifecycleStatus === "published"),
    [reports],
  );

  const publishedReportYears = useMemo(
    () => getAdminReportYears(publishedReports),
    [publishedReports],
  );

  const selectedPublishedYear = useMemo(() => {
    if (publishedPeriodScope.startsWith("year:")) {
      const storedYear = Number(
        publishedPeriodScope.slice("year:".length),
      );

      if (publishedReportYears.includes(storedYear)) {
        return storedYear;
      }
    }

    return publishedReportYears[0] ?? null;
  }, [publishedPeriodScope, publishedReportYears]);

  const noPeriodReports = useMemo(
    () =>
      filterAdminReportsByNavigation(publishedReports, {
        mode: "none",
      }),
    [publishedReports],
  );

  const publishedKindCounts = useMemo(
    () =>
      selectedPublishedYear === null
        ? { month: 0, quarter: 0, year: 0 }
        : countAdminReportsByKind(
            publishedReports,
            selectedPublishedYear,
          ),
    [publishedReports, selectedPublishedYear],
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
    if (activeTab === "draft") return draftReports;
    if (activeTab === "archive") return archivedReports;

    const periodFiltered =
      publishedPeriodScope === "none"
        ? filterAdminReportsByNavigation(
            publishedReports,
            { mode: "none" },
          )
        : selectedPublishedYear === null
          ? []
          : filterAdminReportsByNavigation(
              publishedReports,
              {
                mode: "period",
                year: selectedPublishedYear,
                kind: publishedPeriodKind,
                month:
                  publishedPeriodKind === "month" &&
                  publishedMonthFilter !== "all"
                    ? Number(publishedMonthFilter)
                    : null,
                quarter:
                  publishedPeriodKind === "quarter" &&
                  publishedQuarterFilter !== "all"
                    ? Number(publishedQuarterFilter)
                    : null,
              },
            );

    if (publishedCategoryFilter === "all") {
      return periodFiltered;
    }

    return periodFiltered.filter(
      (report) =>
        normalizeReportCategory(report.categoryTitle) ===
        publishedCategoryFilter,
    );
  }, [
    activeTab,
    archivedReports,
    draftReports,
    publishedCategoryFilter,
    publishedMonthFilter,
    publishedPeriodKind,
    publishedPeriodScope,
    publishedQuarterFilter,
    publishedReports,
    selectedPublishedYear,
  ]);

  const visibleReports = useMemo(() => {
    const normalizedQuery = reportSearchQuery.trim().toLowerCase();

    const filtered = baseVisibleReports.filter((report) => {
      if (!normalizedQuery) return true;

      return [
        report.title,
        report.description,
        report.categoryTitle,
        report.pdf?.originalName,
        getAdminReportPeriodYear(report)
          ? String(getAdminReportPeriodYear(report))
          : "",
        report.periodMonth
          ? getMonthLabel(
              String(report.periodMonth).padStart(2, "0"),
            )
          : "",
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
        return (
          Number(getAdminReportPeriodYear(right) ?? 0) -
          Number(getAdminReportPeriodYear(left) ?? 0)
        );
      }

      if (reportSortMode === "year_asc") {
        return (
          Number(getAdminReportPeriodYear(left) ?? 0) -
          Number(getAdminReportPeriodYear(right) ?? 0)
        );
      }

      if (reportSortMode === "updated_asc") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [baseVisibleReports, reportSearchQuery, reportSortMode]);

  const isPastContext =
    draft.periodKind === "quarter" || draft.periodKind === "year";
  const isArchiveContext = selectedReport?.lifecycleStatus === "archived";
  const canHighlightReport =
    (draft.periodKind === "month" || draft.periodKind === "none") &&
    !isArchiveContext;
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

  function markDirty() {
    if (!panelDirty) setPanelDirty(true);
  }

  function resetWorkspace(nextTab: TabKey = activeTab) {
    setWorkspaceMode("idle");
    setSelectedReportId(null);
    setConfirmAction(null);
    setSubmitIntent("save");
    setActionLabel("Обробляємо звіт...");
    setActionError(null);
    setPanelDirty(false);
    resetPdfInput();
    setDraft(getEmptyDraft("current", firstCategory));
    setActiveTab(nextTab);
  }

  function requestCloseWorkspace() {
    dirtyGuard.request(() => resetWorkspace());
  }

  function openCreateMode() {
    dirtyGuard.request(() => {
      setActiveTab("draft");
      setSelectedReportId(null);
      setWorkspaceMode("create");
      setActionError(null);
      setPanelDirty(false);
      resetPdfInput();
      setDraft(
        getEmptyDraft(
          "current",
          firstCategory,
        ),
      );
    });
  }

  function openEditMode(report: HouseReportSnapshot) {
    dirtyGuard.request(() => {
      setSelectedReportId(report.id);
      setWorkspaceMode("edit");
      setActionError(null);
      setPanelDirty(false);
      resetPdfInput();
      setDraft(mapReportToDraft(report));
    });
  }

  function prepareQuickAction(
    report: HouseReportSnapshot,
    action: "publish" | "archive" | "delete",
  ) {
    setSelectedReportId(report.id);
    setWorkspaceMode("idle");
    setActionError(null);
    setPanelDirty(false);
    resetPdfInput();
    setDraft(mapReportToDraft(report));
    setConfirmAction(action);
  }

  function handleTabChange(tab: TabKey) {
    dirtyGuard.request(() => {
      setActiveTab(tab);
      setWorkspaceMode("idle");
      setSelectedReportId(null);
      setConfirmAction(null);
      setActionError(null);
      setPanelDirty(false);
      resetPdfInput();
      setDraft(getEmptyDraft("current", firstCategory));
    });
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
    markDirty();
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
    const legacyPeriodType = getLegacyPeriodType(draft.periodKind, draft.periodYear);
    const legacyMonth = draft.periodKind === "month" ? draft.periodMonth || null : null;
    const legacyYear =
      draft.periodKind === "month" ||
      draft.periodKind === "quarter" ||
      draft.periodKind === "year"
        ? draft.periodYear
        : null;

    return {
      title: draft.title,
      description: draft.description,
      categoryTitle: normalizeReportCategory(draft.categoryTitle),
      reportDate: draft.reportDate || null,
      period: buildDraftPeriodPayload(draft),
      periodType: legacyPeriodType,
      month: legacyMonth,
      year: legacyYear,
      isPinned: canHighlightReport && Boolean(draft.isPinned),
      isNew: canHighlightReport && Boolean(draft.isNew),
      newUntil: canHighlightReport
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
          resetWorkspace("published");
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

        resetWorkspace(intent === "publish" ? "published" : "archive");
        return;
      }

      resetWorkspace(
        getReportResultLifecycleStatus(updated, selectedReport.lifecycleStatus) ===
          "published"
          ? "published"
          : getReportResultLifecycleStatus(
                updated,
                selectedReport.lifecycleStatus,
              ) === "archived"
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

  async function copyReportToDraft(report: HouseReportSnapshot) {
    setActionError(null);
    setSubmitIntent("copy");
    setActionLabel("Копіюємо звіт у чернетку...");

    const copied = await dispatch(
      {
        type: "reports.duplicate",
        houseId,
        payload: {
          sourceId: report.id,
          targetHouseIds: [houseId],
        },
      },
      { onError: setActionError },
    );

    if (!copied) return;

    resetWorkspace("draft");
    setActiveTab("draft");
  }

  async function copySelectedReportToDraft() {
    if (!selectedReport) return;
    await copyReportToDraft(selectedReport);
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

          <div className="flex flex-wrap items-center gap-3">
            {activeTab === "archive" ? (
              archivedReports.length > 0 && !readOnlyMode ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmAction("delete_archive")}
                  className={adminButtonClasses({ variant: "danger" })}
                >
                  {isPending && submitIntent === "delete"
                    ? "Видаляємо архів..."
                    : "Видалити все"}
                </button>
              ) : null
            ) : (
              <>
                <button
                  type="button"
                  disabled={readOnlyMode || isPending}
                  onClick={() => void handleCategoriesSync()}
                  className={adminButtonClasses({ variant: "secondary" })}
                >
                  Синхронізувати категорії
                </button>
                <button
                  type="button"
                  data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode}
                  disabled={readOnlyMode || isPending}
                  className={adminButtonClasses({ variant: "primary" })}
                >
                  Новий звіт
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <AdminSegmentedTabs
            items={[
              {
                key: "published",
                label: "Опубліковані",
                count: publishedReports.length,
              },
              { key: "draft", label: "Чернетки", count: draftReports.length },
              { key: "archive", label: "Архів", count: archivedReports.length },
            ]}
            activeKey={activeTab}
            onChange={(key) => {
              setVisibleReportCount(20);
              handleTabChange(key as TabKey);
            }}
            ariaLabel="Фільтр звітів"
          />

        </div>
      </div>

      <AdminSidePanel
        title={workspaceMode === "edit" ? "Редагування звіту" : "Новий звіт"}
        description={selectedReport ? (
          <div className="flex flex-wrap items-center gap-3">
            <AdminStatusBadge tone={statusToneFor(selectedReport.lifecycleStatus)}>
              {statusLabelFor(selectedReport.lifecycleStatus)}
            </AdminStatusBadge>
            <span>Оновлено: {formatAdminDate(selectedReport.updatedAt)}</span>
          </div>
        ) : "Новий звіт створюється як чернетка."}
        isOpen={workspaceMode !== "idle"}
        onClose={requestCloseWorkspace}
      >
        {workspaceMode !== "idle" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitReport("save");
            }}
            onChange={markDirty}
          >
          <div className="hidden">
            <div>
              <div className="text-lg font-semibold text-[var(--cms-text)]">
                {workspaceMode === "edit"
                  ? "Редагування звіту"
                  : isPastContext
                    ? "Новий звіт за період"
                    : "Новий звіт"}
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
                onClick={requestCloseWorkspace}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-lg text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
                aria-label="Закрити форму"
              >
                ×
              </button>
            </div>
          </div>

          {actionError ? (
            <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]">
              {actionError}
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
                value={draft.periodKind}
                onChange={(event) => {
                  const nextKind = event.target.value as HouseReportPeriodKind;

                  setDraft((prev) => ({
                    ...prev,
                    periodType: getLegacyPeriodType(
                      nextKind,
                      nextKind === "none"
                        ? null
                        : prev.periodYear ?? getDefaultYear(getDraftTab(prev)),
                    ),
                    periodKind: nextKind,
                    periodMonth: nextKind === "month" ? prev.periodMonth : "",
                    periodQuarter:
                      nextKind === "quarter" ? prev.periodQuarter || "1" : "1",
                    periodYear:
                      nextKind === "none"
                        ? null
                        : prev.periodYear ?? getDefaultYear(getDraftTab(prev)),
                    month: nextKind === "month" ? prev.periodMonth : "",
                    year:
                      nextKind === "none"
                        ? null
                        : prev.periodYear ?? getDefaultYear(getDraftTab(prev)),
                    isPinned:
                      nextKind === "quarter" || nextKind === "year"
                        ? false
                        : prev.isPinned,
                    isNew:
                      nextKind === "quarter" || nextKind === "year"
                        ? false
                        : prev.isNew,
                    newUntil:
                      nextKind === "quarter" || nextKind === "year"
                        ? null
                        : prev.newUntil,
                  }));
                }}
                className={adminInputClass}
              >
                {PERIOD_KIND_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {draft.periodKind === "month" ? (
              <>
                <label className="block">
                  <span className={`mb-2 block ${adminTextLabelClass}`}>
                    Місяць
                  </span>
                  <select
                    value={draft.periodMonth}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodMonth: event.target.value,
                        month: event.target.value,
                      }))
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

                <label className="block">
                  <span className={`mb-2 block ${adminTextLabelClass}`}>
                    Рік
                  </span>
                  <select
                    value={String(draft.periodYear ?? getDefaultYear("current"))}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodYear: Number(event.target.value),
                        year: Number(event.target.value),
                      }))
                    }
                    className={adminInputClass}
                  >
                    {REPORT_YEAR_OPTIONS.map((item) => (
                      <option key={item} value={String(item)}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {draft.periodKind === "quarter" ? (
              <>
                <label className="block">
                  <span className={`mb-2 block ${adminTextLabelClass}`}>
                    Квартал
                  </span>
                  <select
                    value={draft.periodQuarter}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodQuarter: event.target.value,
                      }))
                    }
                    className={adminInputClass}
                  >
                    {QUARTER_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={`mb-2 block ${adminTextLabelClass}`}>
                    Рік
                  </span>
                  <select
                    value={String(draft.periodYear ?? getDefaultYear("past"))}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        periodYear: Number(event.target.value),
                        year: Number(event.target.value),
                      }))
                    }
                    className={adminInputClass}
                  >
                    {REPORT_YEAR_OPTIONS.map((item) => (
                      <option key={item} value={String(item)}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            {draft.periodKind === "year" ? (
              <label className="block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Рік
                </span>
                <select
                  value={String(draft.periodYear ?? getDefaultYear("past"))}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      periodYear: Number(event.target.value),
                      year: Number(event.target.value),
                    }))
                  }
                  className={adminInputClass}
                >
                  {REPORT_YEAR_OPTIONS.map((item) => (
                    <option key={item} value={String(item)}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {draft.periodKind === "none" ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-sm text-[var(--cms-text-muted)]">
                Звіт буде збережено без місяця, кварталу або року.
              </div>
            ) : null}

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
                      markDirty();
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

              <div className="mt-4 block">
                <span className={`mb-2 block ${adminTextLabelClass}`}>
                  Завантажити / замінити PDF
                </span>
                <FileDropzone
                  inputRef={reportPdfInputRef}
                  accept="application/pdf,.pdf"
                  hint={getSinglePdfHintMessage()}
                  label={selectedReport?.pdf?.path ? "Замінити PDF" : "Додати PDF"}
                  onChange={handleReportPdfChange}
                  file={selectedPdf}
                  disabled={isPending}
                  saving={isPending && !selectedPdf}
                  kind="pdf"
                />
              </div>

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

          {canHighlightReport ? (
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

          <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-[var(--cms-border)] bg-[var(--cms-surface)] px-6 py-4 shadow-[var(--cms-shadow-up)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit" title="Зберегти (Ctrl/Cmd+Enter)"
                  disabled={readOnlyMode || isPending || Boolean(reportPdfError)}
                  className={`${adminButtonClasses({ variant: "primary" })} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isPending && submitIntent === "save" ? "Зберігаємо..." : "Зберегти"}
                </button>

                {isDraftLikeEdit ? (
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending}
                    onClick={() => setConfirmAction("delete")}
                    className={adminButtonClasses({ variant: "danger" })}
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
                    className={adminButtonClasses({ variant: "success" })}
                  >
                    {isPending && submitIntent === "publish" ? "Публікуємо..." : "Опублікувати"}
                  </button>
                </div>
              ) : null}

              {isPublishedEdit ? (
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending || Boolean(reportPdfError)}
                    onClick={() => setConfirmAction("archive")}
                    className={adminButtonClasses({ variant: "secondary" })}
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
                    className={adminButtonClasses({ variant: "secondary" })}
                  >
                    Відновити
                  </button>
                  <button
                    type="button"
                    disabled={readOnlyMode || isPending}
                    onClick={() => setConfirmAction("delete")}
                    className={adminButtonClasses({ variant: "danger" })}
                  >
                    Видалити
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </form>
        ) : null}
      </AdminSidePanel>

      <div className={`${adminSurfaceClass} p-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--cms-text)]">
              {activeTab === "published"
                ? "Опубліковані звіти"
                : activeTab === "draft"
                  ? "Чернетки"
                  : "Архів"}
            </h3>
            <p className="mt-1 text-sm text-[var(--cms-text-muted)]">
              Відкрий картку для редагування, публікації або архівації.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={reportSearchQuery}
              onChange={(event) => {
                setReportSearchQuery(event.target.value);
                setVisibleReportCount(20);
              }}
              placeholder="Пошук за назвою, категорією, роком..."
              className={`${adminInputClass} sm:w-80`}
            />
            <select
              value={reportSortMode}
              onChange={(event) => {
                setReportSortMode(event.target.value as ReportSortMode);
                setVisibleReportCount(20);
              }}
              className={adminInputClass}
            >
              <option value="updated_desc">Новіші оновлення</option>
              <option value="updated_asc">Старіші оновлення</option>
              <option value="title_asc">Назва А-Я</option>
              <option value="title_desc">Назва Я-А</option>
              <option value="year_desc">Рік ↓</option>
              <option value="year_asc">Рік ↑</option>
            </select>
            <WorkspaceViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          <WorkspacePaginationControls
            visible={visibleReportCount}
            total={visibleReports.length}
            onShowMore={() =>
              setVisibleReportCount((current) => current + 20)
            }
          />
        </div>

        {activeTab === "published" ? (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {publishedReportYears.map((year) => {
                const key = `year:${year}`;
                const yearCount = publishedReports.filter(
                  (report) =>
                    report.periodKind !== "none" &&
                    getAdminReportPeriodYear(report) === year,
                ).length;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setPublishedPeriodScope(key);
                      setVisibleReportCount(20);
                    }}
                    className={adminButtonClasses({
                      variant:
                        publishedPeriodScope !== "none" &&
                        selectedPublishedYear === year
                          ? "primary"
                          : "secondary",
                    })}
                  >
                    {year} · {yearCount}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setPublishedPeriodScope("none");
                  setVisibleReportCount(20);
                }}
                className={adminButtonClasses({
                  variant:
                    publishedPeriodScope === "none"
                      ? "primary"
                      : "secondary",
                })}
              >
                Без періоду · {noPeriodReports.length}
              </button>
            </div>

            {publishedPeriodScope !== "none" &&
            selectedPublishedYear !== null ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["month", "Місяці", publishedKindCounts.month],
                    ["quarter", "Квартали", publishedKindCounts.quarter],
                    ["year", "Річний", publishedKindCounts.year],
                  ].map(([key, label, count]) => (
                    <button
                      key={String(key)}
                      type="button"
                      onClick={() => {
                        setPublishedPeriodKind(
                          key as AdminReportPeriodKind,
                        );
                        setVisibleReportCount(20);
                      }}
                      className={adminButtonClasses({
                        variant:
                          publishedPeriodKind === key
                            ? "primary"
                            : "secondary",
                      })}
                    >
                      {label} · {count}
                    </button>
                  ))}
                </div>

                {publishedPeriodKind === "month" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPublishedMonthFilter("all");
                        setVisibleReportCount(20);
                      }}
                      className={adminButtonClasses({
                        variant:
                          publishedMonthFilter === "all"
                            ? "primary"
                            : "secondary",
                      })}
                    >
                      Усі місяці
                    </button>

                    {CURRENT_MONTH_OPTIONS.map((month) => {
                      const monthNumber = Number(month.value);
                      const count = publishedReports.filter(
                        (report) =>
                          report.periodKind === "month" &&
                          getAdminReportPeriodYear(report) ===
                            selectedPublishedYear &&
                          report.periodMonth === monthNumber,
                      ).length;

                      return (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => {
                            setPublishedMonthFilter(month.value);
                            setVisibleReportCount(20);
                          }}
                          className={adminButtonClasses({
                            variant:
                              publishedMonthFilter === month.value
                                ? "primary"
                                : "secondary",
                          })}
                        >
                          {month.label} · {count}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {publishedPeriodKind === "quarter" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPublishedQuarterFilter("all");
                        setVisibleReportCount(20);
                      }}
                      className={adminButtonClasses({
                        variant:
                          publishedQuarterFilter === "all"
                            ? "primary"
                            : "secondary",
                      })}
                    >
                      Усі квартали
                    </button>

                    {QUARTER_OPTIONS.map((quarter) => {
                      const quarterNumber = Number(quarter.value);
                      const count = publishedReports.filter(
                        (report) =>
                          report.periodKind === "quarter" &&
                          getAdminReportPeriodYear(report) ===
                            selectedPublishedYear &&
                          report.periodQuarter === quarterNumber,
                      ).length;

                      return (
                        <button
                          key={quarter.value}
                          type="button"
                          onClick={() => {
                            setPublishedQuarterFilter(
                              quarter.value,
                            );
                            setVisibleReportCount(20);
                          }}
                          className={adminButtonClasses({
                            variant:
                              publishedQuarterFilter ===
                              quarter.value
                                ? "primary"
                                : "secondary",
                          })}
                        >
                          {quarter.label} · {count}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPublishedCategoryFilter("all")}
                className={adminButtonClasses({
                  variant:
                    publishedCategoryFilter === "all"
                      ? "primary"
                      : "secondary",
                })}
              >
                Усі категорії
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setPublishedCategoryFilter(category)}
                  className={adminButtonClasses({
                    variant:
                      publishedCategoryFilter === category
                        ? "primary"
                        : "secondary",
                  })}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {visibleReports.length === 0 ? (
          <EmptyState className="mt-6" title="У цьому списку поки немає звітів" description="Створіть новий звіт або змініть активні фільтри." action={!String(activeTab).startsWith("archiv") ? (
            <button type="button" data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode} className={adminButtonClasses({ variant: "primary" })}>Створити звіт</button>
          ) : undefined} />
        ) : (
          <div
            className={[
              "mt-6 grid gap-3",
              viewMode === "grid" ? "md:grid-cols-2" : "grid-cols-1",
            ].join(" ")}
          >
            {visibleReports.slice(0, visibleReportCount).map((report) => (
              <div
                key={report.id}
                role="button"
                tabIndex={0}
                onClick={() => openEditMode(report)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditMode(report);
                  }
                }}
                className="relative rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 pr-16 text-left transition hover:-translate-y-0.5 hover:border-[var(--cms-border-strong)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone={statusToneFor(report.lifecycleStatus)}>
                    {statusLabelFor(report.lifecycleStatus)}
                  </AdminStatusBadge>
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

                {!readOnlyMode ? (
                  <div>
                    <WorkspaceQuickActions
                      actions={[
                        ...(report.lifecycleStatus === "draft"
                          ? [
                              {
                                key: "publish",
                                label: "Опублікувати",
                                onSelect: () => prepareQuickAction(report, "publish"),
                              },
                              {
                                key: "delete",
                                label: "Видалити",
                                tone: "danger" as const,
                                onSelect: () => prepareQuickAction(report, "delete"),
                              },
                            ]
                          : []),
                        ...(report.lifecycleStatus === "published"
                          ? [
                              {
                                key: "archive",
                                label: "В архів",
                                onSelect: () => prepareQuickAction(report, "archive"),
                              },
                              {
                                key: "duplicate",
                                label: "Створити на основі",
                                disabled: isPending,
                                onSelect: () => void copyReportToDraft(report),
                              },
                            ]
                          : []),
                        ...(report.lifecycleStatus === "archived"
                          ? [
                              {
                                key: "delete",
                                label: "Видалити",
                                tone: "danger" as const,
                                onSelect: () => prepareQuickAction(report, "delete"),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--cms-text-soft)]">
                  <span>{formatAdminDate(report.reportDate, "Дату не вказано")}</span>
                  <span>·</span>
                  <span>
                    {formatReportPeriodLabel(report)}
                  </span>
                  <span>·</span>
                  <span>{report.pdf ? report.pdf.originalName ?? "PDF додано" : "PDF не додано"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PlatformConfirmModal
        open={dirtyGuard.confirmOpen}
        title="Є незбережені зміни"
        description="Якщо продовжити, внесені зміни буде втрачено."
        confirmLabel="Вийти без збереження"
        cancelLabel="Продовжити редагування"
        tone="warning"
        onCancel={dirtyGuard.cancel}
        onConfirm={dirtyGuard.discardAndContinue}
      />

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
