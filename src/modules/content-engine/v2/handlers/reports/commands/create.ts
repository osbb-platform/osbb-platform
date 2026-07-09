import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateReportPayload, HouseReport } from "../types";
import {
  normalizeBoolean,
  normalizeCategoryId,
  normalizeCategoryTitle,
  normalizeDateTime,
  normalizeDescription,
  normalizePdf,
  normalizeReportDate,
  normalizeSortOrder,
  normalizeText,
  publicReportPaths,
  readHouseReportPeriod,
  reportHistoryMetadata,
  toFileTrack,
  toLegacyPeriodColumns,
  toPeriodColumns,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateReportPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву звіту.", "VALIDATION_FAILED");
    }

    const period = readHouseReportPeriod(rawPayload);
    if (!period.ok) return period;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateReportPayload;
    const now = new Date().toISOString();
    const pdf = normalizePdf(payload.pdf);
    const periodResult = readHouseReportPeriod(payload);

    if (!periodResult.ok) {
      return periodResult;
    }

    const legacyPeriod = toLegacyPeriodColumns(payload, periodResult.data);
    const periodColumns = toPeriodColumns(periodResult.data);

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .insert({
        house_id: ctx.house.id,
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
        lifecycle_status: "draft",
        sort_order: normalizeSortOrder(payload.sortOrder),
        created_by: ctx.user.id,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(
        `Не вдалося створити звіт: ${error?.message ?? "невідома помилка"}`,
        "INTERNAL",
      );
    }

    const report = data as HouseReport;

    return ok({
      data: report,
      history: {
        entityType: HOUSE_REPORT_ENTITY_TYPE,
        entityId: report.id,
        action: "created",
        description: `Створено звіт «${report.title}».`,
        afterSnapshot: report,
        metadata: reportHistoryMetadata(),
      },
      filesToTrack: pdf ? [toFileTrack(pdf)] : undefined,
      tasks: {
        ensure: {
          entityType: HOUSE_REPORT_ENTITY_TYPE,
          entityId: report.id,
          title: report.title,
        },
      },
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
