import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HouseReportCategorySnapshot,
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
  period_type: "current" | "past";
  month: string | null;
  year: number | null;
  is_pinned: boolean;
  is_new: boolean;
  new_until: string | null;
  lifecycle_status: "published";
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

function mapReport(
  row: HouseReportRow,
  file: HouseReportFileRow | undefined,
): HouseReportSnapshot {
  return {
    id: row.id,
    houseId: row.house_id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryTitle: row.category_title,
    reportDate: row.report_date,
    periodType: row.period_type,
    month: row.month,
    year: row.year,
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
      .eq("lifecycle_status", "published")
      .order("is_pinned", { ascending: false })
      .order("report_date", { ascending: false }),
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
    reports: reports.map((report) => mapReport(report, filesByReportId.get(report.id))),
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
