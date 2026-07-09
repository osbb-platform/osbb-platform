import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HouseReportCategorySnapshot,
  HouseReportLifecycle,
  HouseReportPeriodKind,
  HouseReportPeriodType,
  HouseReportSnapshot,
} from "./getAdminHouseReports";

type PublishedHouseReportsData = {
  reports: HouseReportSnapshot[];
  categories: HouseReportCategorySnapshot[];
};

type HouseReportFileRow = {
  entity_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
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

function emptyReports(): PublishedHouseReportsData {
  return {
    reports: [],
    categories: [],
  };
}

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

function getLegacyPeriodType(periodKind: HouseReportPeriodKind): HouseReportPeriodType {
  return periodKind === "quarter" || periodKind === "year" ? "past" : "current";
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

function getPeriodSortKey(report: HouseReportSnapshot) {
  if (!report.periodYear) {
    return -1;
  }

  if (report.periodKind === "year") {
    return report.periodYear * 100 + 13;
  }

  if (report.periodKind === "quarter" && report.periodQuarter) {
    return report.periodYear * 100 + report.periodQuarter * 3;
  }

  if (report.periodKind === "month" && report.periodMonth) {
    return report.periodYear * 100 + report.periodMonth;
  }

  return -1;
}

function sortPublishedReports(reports: HouseReportSnapshot[]) {
  return [...reports].sort((left, right) => {
    const pinnedDiff =
      Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));

    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }

    const periodDiff = getPeriodSortKey(right) - getPeriodSortKey(left);

    if (periodDiff !== 0) {
      return periodDiff;
    }

    const leftDate = new Date(left.reportDate ?? left.publishedAt ?? left.updatedAt).getTime() || 0;
    const rightDate = new Date(right.reportDate ?? right.publishedAt ?? right.updatedAt).getTime() || 0;
    const dateDiff = rightDate - leftDate;

    if (dateDiff !== 0) {
      return dateDiff;
    }

    const sortOrderDiff = left.sortOrder - right.sortOrder;

    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }

    return left.title.localeCompare(right.title, "uk", {
      numeric: true,
      sensitivity: "base",
    });
  });
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
    periodType: getLegacyPeriodType(periodKind),
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

async function loadPublishedHouseReports(houseId: string): Promise<PublishedHouseReportsData> {
  const supabase = createSupabasePublicClient();

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
      .eq("house_id", houseId)
      .eq("lifecycle_status", "published"),
    supabase
      .from("house_report_categories")
      .select("id, house_id, title, sort_order, created_at, updated_at")
      .eq("house_id", houseId)
      .order("sort_order", { ascending: true }),
  ]);

  if (reportsResult.error) {
    console.error("Failed to load published house reports:", {
      houseId,
      message: reportsResult.error.message,
    });
    return emptyReports();
  }

  if (categoriesResult.error) {
    console.error("Failed to load published house report categories:", {
      houseId,
      message: categoriesResult.error.message,
    });
    return {
      reports: [],
      categories: [],
    };
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
      console.error("Failed to load published house report files:", {
        houseId,
        message: filesError.message,
      });
    } else {
      filesByReportId = new Map(
        ((files ?? []) as unknown as HouseReportFileRow[]).map((file) => [
          file.entity_id,
          file,
        ]),
      );
    }
  }

  return {
    reports: sortPublishedReports(
      reports.map((report) => mapReport(report, filesByReportId.get(report.id))),
    ),
    categories: ((categoriesResult.data ?? []) as unknown as HouseReportCategoryRow[]).map(mapCategory),
  };
}

export const getPublishedHouseReports = cache(
  async (houseId: string): Promise<PublishedHouseReportsData> => {
    return unstable_cache(
      () => loadPublishedHouseReports(houseId),
      ["published-house-reports", houseId],
      {
        tags: [`house:${houseId}:reports`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
