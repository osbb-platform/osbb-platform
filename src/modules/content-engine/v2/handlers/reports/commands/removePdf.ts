import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseReport, RemoveReportPdfPayload } from "../types";
import {
  getReport,
  pdfDeleteRef,
  publicReportPaths,
  readIdAndLock,
  reportHistoryMetadata,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const removePdfCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as RemoveReportPdfPayload;
    const beforeResult = await getReport(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .update({
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
        action: "pdf_removed",
        description: `Видалено PDF звіту «${report.title}».`,
        beforeSnapshot: before,
        afterSnapshot: report,
        metadata: reportHistoryMetadata(),
      },
      filesToDelete: [pdfDeleteRef(report.id)],
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
