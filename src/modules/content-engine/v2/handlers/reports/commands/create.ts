import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateReportPayload, HouseReport } from "../types";
import {
  normalizeBoolean,
  normalizeCategoryId,
  normalizeCategoryTitle,
  normalizeDateTime,
  normalizeDescription,
  normalizeMonth,
  normalizePdf,
  normalizePeriodType,
  normalizeReportDate,
  normalizeSortOrder,
  normalizeText,
  normalizeYear,
  publicReportPaths,
  reportHistoryMetadata,
  toFileTrack,
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

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateReportPayload;
    const now = new Date().toISOString();
    const pdf = normalizePdf(payload.pdf);

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .insert({
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        description: normalizeDescription(payload.description),
        category_id: normalizeCategoryId(payload.categoryId),
        category_title: normalizeCategoryTitle(payload.categoryTitle),
        report_date: normalizeReportDate(payload.reportDate),
        period_type: normalizePeriodType(payload.periodType),
        month: normalizeMonth(payload.month),
        year: normalizeYear(payload.year),
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
