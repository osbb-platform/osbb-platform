import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseReport } from "../types";
import {
  pdfDeleteRef,
  publicReportPaths,
  readIdAndLock,
  reportHistoryMetadata,
  HOUSE_REPORT_ENTITY_TYPE,
} from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as { id: string; lockVersion: number };

    const { data, error } = await ctx.supabase
      .from("house_reports")
      .delete()
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Звіт не знайдено або дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const report = data as HouseReport;

    return ok({
      data: report,
      history: {
        entityType: HOUSE_REPORT_ENTITY_TYPE,
        entityId: report.id,
        action: "deleted",
        description: `Видалено звіт «${report.title}».`,
        beforeSnapshot: report,
        metadata: reportHistoryMetadata(),
      },
      filesToDelete: [pdfDeleteRef(report.id)],
      tasks: {
        delete: {
          entityType: HOUSE_REPORT_ENTITY_TYPE,
          entityId: report.id,
        },
      },
      extraRevalidatePaths: publicReportPaths(ctx.house.slug),
    });
  },
};
