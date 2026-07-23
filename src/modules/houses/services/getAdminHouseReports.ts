import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseReportLifecycle = "draft" | "published" | "archived";
export type HouseReportPeriodType = "current" | "past";
export type HouseReportPeriodKind = "none" | "month" | "quarter" | "year";

type HouseReportFileRow = {
  entity_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

export type HouseReportCategorySnapshot = {
  id: string;
  houseId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type HouseReportSnapshot = {
  id: string;
  houseId: string;
  title: string;
  description: string;
  categoryId: string | null;
  categoryTitle: string;
  reportDate: string | null;

  /**
   * Legacy compatibility fields. Derived from periodKind after P01.T5.
   */
  periodType: HouseReportPeriodType;
  month: string | null;
  year: number | null;

  periodKind: HouseReportPeriodKind;
  periodMonth: number | null;
  periodQuarter: number | null;
  periodYear: number | null;

  isPinned: boolean;
  isNew: boolean;
  newUntil: string | null;
  lifecycleStatus: HouseReportLifecycle;
  lockVersion: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
  createdBy: string | null;
  pdf: {
    bucket: string;
    path: string;
    originalName: string | null;
    mimeType: string | null;
    size: number | null;
    uploadedAt: string | null;
  } | null;
};

export type AdminHouseReportsData = {
  reports: HouseReportSnapshot[];
  categories: HouseReportCategorySnapshot[];
};

type HouseReportRow = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  category_id: string | null;
  category_title: string;
  report_date: string | null;
  period_type: HouseReportPeriodType;
  month: string | null;
  year: number | null;
  period_kind: HouseReportPeriodKind | null;
  period_month: number | null;
  period_quarter: number | null;
  period_year: number | null;
  is_pinned: boolean;
  is_new: boolean;
  new_until: string | null;
  lifecycle_status: HouseReportLifecycle;
  lock_version: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
};

type HouseReportCategoryRow = {
  id: string;
  house_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapCategory(row: HouseReportCategoryRow): HouseReportCategorySnapshot {
  return {
    id: row.id,
    houseId: row.house_id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePeriodKind(value: unknown): HouseReportPeriodKind {
  if (value === "month" || value === "quarter" || value === "year") {
    return value;
  }

  return "none";
}

function normalizePeriodNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value >= min && value <= max ? value : null;
}

function formatMonth(value: number | null) {
  return value ? String(value).padStart(2, "0") : null;
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

function getLegacyMonth(
  periodKind: HouseReportPeriodKind,
  periodMonth: number | null,
) {
  return periodKind === "month" ? formatMonth(periodMonth) : null;
}

function getLegacyYear(
  periodKind: HouseReportPeriodKind,
  periodYear: number | null,
) {
  return periodKind === "month" ||
    periodKind === "quarter" ||
    periodKind === "year"
    ? periodYear
    : null;
}

function mapReport(
  row: HouseReportRow,
  file: HouseReportFileRow | undefined,
): HouseReportSnapshot {
  const periodKind = normalizePeriodKind(row.period_kind);
  const periodMonth = normalizePeriodNumber(row.period_month, 1, 12);
  const periodQuarter = normalizePeriodNumber(row.period_quarter, 1, 4);
  const periodYear = normalizePeriodNumber(row.period_year, 2000, 2100);

  return {
    id: row.id,
    houseId: row.house_id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryTitle: row.category_title,
    reportDate: row.report_date,
    periodType: getLegacyPeriodType(periodKind, periodYear),
    month: getLegacyMonth(periodKind, periodMonth),
    year: getLegacyYear(periodKind, periodYear),
    periodKind,
    periodMonth: periodKind === "month" ? periodMonth : null,
    periodQuarter: periodKind === "quarter" ? periodQuarter : null,
    periodYear: getLegacyYear(periodKind, periodYear),
    isPinned: row.is_pinned,
    isNew: row.is_new,
    newUntil: row.new_until,
    lifecycleStatus: row.lifecycle_status,
    lockVersion: row.lock_version,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    pdf:
      file?.storage_bucket && file.storage_path
        ? {
            bucket: file.storage_bucket,
            path: file.storage_path,
            originalName: file.original_file_name,
            mimeType: file.mime_type,
            size: file.size_bytes,
            uploadedAt: file.uploaded_at,
          }
        : null,
  };
}

export async function getAdminHouseReports(params: {
  houseId: string;
}): Promise<AdminHouseReportsData> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const [reportsResult, categoriesResult] = await Promise.all([
    supabase
      .from("house_reports")
      .select(
        [
          "id",
          "house_id",
          "title",
          "description",
          "category_id",
          "category_title",
          "report_date",
          "period_type",
          "month",
          "year",
          "period_kind",
          "period_month",
          "period_quarter",
          "period_year",
          "is_pinned",
          "is_new",
          "new_until",
          "lifecycle_status",
          "lock_version",
          "sort_order",
          "created_at",
          "updated_at",
          "published_at",
          "archived_at",
          "created_by",
        ].join(", "),
      )
      .eq("house_id", params.houseId)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false }),
    supabase
      .from("house_report_categories")
      .select("id, house_id, title, sort_order, created_at, updated_at")
      .eq("house_id", params.houseId)
      .order("sort_order", { ascending: true }),
  ]);

  if (reportsResult.error) {
    throw new Error(`Failed to load admin house reports: ${reportsResult.error.message}`);
  }

  if (categoriesResult.error) {
    throw new Error(`Failed to load house report categories: ${categoriesResult.error.message}`);
  }

  const reports = (reportsResult.data ?? []) as unknown as HouseReportRow[];
  const reportIds = reports.map((report) => report.id);

  let filesByReportId = new Map<string, HouseReportFileRow>();

  if (reportIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("house_content_files")
      .select(
        [
          "entity_id",
          "storage_bucket",
          "storage_path",
          "original_file_name",
          "mime_type",
          "size_bytes",
          "uploaded_at",
        ].join(", "),
      )
      .eq("entity_type", "house_report")
      .eq("field_key", "pdf")
      .in("entity_id", reportIds);

    if (filesError) {
      throw new Error(`Failed to load house report files: ${filesError.message}`);
    }

    filesByReportId = new Map(
      ((files ?? []) as unknown as HouseReportFileRow[]).map((file) => [
        file.entity_id,
        file,
      ]),
    );
  }

  return {
    reports: reports.map((report) => mapReport(report, filesByReportId.get(report.id))),
    categories: ((categoriesResult.data ?? []) as unknown as HouseReportCategoryRow[]).map(mapCategory),
  };
}
