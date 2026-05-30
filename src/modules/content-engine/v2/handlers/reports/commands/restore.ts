import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseReport, ReportIdAndLock } from "../types";
import {
  getReport,
  publicReportPaths,
  readIdAndLock,
  reportHistoryMetadata,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const restoreCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReportIdAndLock;
    const beforeResult = await getReport(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .update({
        lifecycle_status: "draft",
        published_at: null,
        archived_at: null,
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
        action: "restored",
        description: `Відновлено звіт «${report.title}».`,
        beforeSnapshot: before,
        afterSnapshot: report,
        metadata: reportHistoryMetadata(),
      },
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
