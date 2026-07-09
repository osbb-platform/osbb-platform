import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseReport, UpdateReportPayload } from "../types";
import {
  getReport,
  normalizeBoolean,
  normalizeCategoryId,
  normalizeCategoryTitle,
  normalizeDateTime,
  normalizeDescription,
  normalizePdf,
  normalizeReportDate,
  normalizeSortOrder,
  normalizeText,
  pdfDeleteRef,
  publicReportPaths,
  readHouseReportPeriod,
  readIdAndLock,
  reportHistoryMetadata,
  toFileTrack,
  toLegacyPeriodColumns,
  toPeriodColumns,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdateReportPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву звіту.", "VALIDATION_FAILED");
    }

    const period = readHouseReportPeriod(rawPayload);
    if (!period.ok) return period;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateReportPayload;
    const beforeResult = await getReport(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const periodResult = readHouseReportPeriod(payload);
    if (!periodResult.ok) {
      return periodResult;
    }

    const before = beforeResult.data;
    const pdf = normalizePdf(payload.pdf);
    const shouldRemovePdf = payload.removePdf === true || Boolean(pdf);
    const now = new Date().toISOString();
    const legacyPeriod = toLegacyPeriodColumns(payload, periodResult.data);
    const periodColumns = toPeriodColumns(periodResult.data);

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .update({
        title: normalizeText(payload.title),
        description: normalizeDescription(payload.description),
        category_id: normalizeCategoryId(payload.categoryId),
        category_title: normalizeCategoryTitle(payload.categoryTitle),
        report_date: normalizeReportDate(payload.reportDate),
        period_type: legacyPeriod.period_type,
        month: legacyPeriod.month,
        year: legacyPeriod.year,
        period_kind: periodColumns.period_kind,
        period_month: periodColumns.period_month,
        period_quarter: periodColumns.period_quarter,
        period_year: periodColumns.period_year,
        is_pinned: normalizeBoolean(payload.isPinned),
        is_new: normalizeBoolean(payload.isNew),
        new_until: normalizeDateTime(payload.newUntil),
        sort_order: normalizeSortOrder(payload.sortOrder),
        updated_at: now,
        lock_version: payload.lockVersion + 1,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const report = data as HouseReport;

    return ok({
      data: report,
      history: {
        entityType: HOUSE_REPORT_ENTITY_TYPE,
        entityId: report.id,
        action: "updated",
        description: `Оновлено звіт «${report.title}».`,
        beforeSnapshot: before,
        afterSnapshot: report,
        metadata: reportHistoryMetadata(),
      },
      filesToDelete: shouldRemovePdf ? [pdfDeleteRef(report.id)] : undefined,
      filesToTrack: pdf ? [toFileTrack(pdf)] : undefined,
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
