import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseReport } from "../types";
import {
  pdfDeleteRef,
  publicReportPaths,
  reportHistoryMetadata,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const deleteAllArchivedCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const { data, error } = await ctx.supabase
      .from("house_reports")
      .delete()
      .eq("house_id", ctx.house.id)
      .eq("lifecycle_status", "archived")
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const reports = (data ?? []) as HouseReport[];

    return ok({
      data: {
        deletedCount: reports.length,
      },
      history: {
        entityType: HOUSE_REPORT_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "bulk_deleted_archived",
        description: `Масово видалено архівні звіти: ${reports.length}.`,
        beforeSnapshot: reports,
        metadata: reportHistoryMetadata({
          deletedCount: reports.length,
        }),
      },
      filesToDelete: reports.map((report) => pdfDeleteRef(report.id)),
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
