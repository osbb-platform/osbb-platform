export const HOUSE_REPORT_ENTITY_TYPE = "house_report";
export const HOUSE_REPORT_CATEGORY_ENTITY_TYPE = "house_report_categories";
export const HOUSE_REPORT_PDF_FIELD_KEY = "pdf";
export const HOUSE_REPORT_BUCKET = "house-reports";

export type HouseReportLifecycle = "draft" | "published" | "archived";

/**
 * Deprecated P01 legacy period type. Kept only for backward-compatible
 * payloads and legacy columns period_type/month/year.
 */
export type HouseReportPeriodType = "current" | "past";

export type HouseReportPeriodKind = "none" | "month" | "quarter" | "year";

export type HouseReportPeriod =
  | { kind: "none" }
  | { kind: "month"; month: number; year: number }
  | { kind: "quarter"; quarter: number; year: number }
  | { kind: "year"; year: number };

export type HouseReportFileInput = {
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type HouseReport = {
  id: string;
  house_id: string;
  title: string;
  description: string;
  category_id: string | null;
  category_title: string;
  report_date: string | null;

  /**
   * Deprecated P01 legacy fields. New code should prefer period_kind,
   * period_month, period_quarter and period_year.
   */
  period_type: HouseReportPeriodType;
  month: string | null;
  year: number | null;

  period_kind: HouseReportPeriodKind;
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

export type HouseReportCategory = {
  id: string;
  house_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ReportIdAndLock = {
  id: string;
  lockVersion: number;
};

export type CreateReportPayload = {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  categoryTitle?: string | null;
  reportDate?: string | null;

  period?: HouseReportPeriod | null;

  /**
   * Deprecated P01 legacy payload fields. Accepted during transition from
   * the old admin form and inflight requests.
   */
  periodType?: HouseReportPeriodType | null;
  month?: string | null;
  year?: number | null;

  isPinned?: boolean;
  isNew?: boolean;
  newUntil?: string | null;
  sortOrder?: number | null;
  pdf?: HouseReportFileInput | null;
};

export type UpdateReportPayload = ReportIdAndLock & CreateReportPayload & {
  removePdf?: boolean;
};

export type ReplaceReportPdfPayload = ReportIdAndLock & {
  pdf: HouseReportFileInput;
};

export type RemoveReportPdfPayload = ReportIdAndLock;

export type CategoriesUpsertReportsPayload = {
  categories: Array<{
    id?: string | null;
    title: string;
    sortOrder?: number | null;
  }>;
};
