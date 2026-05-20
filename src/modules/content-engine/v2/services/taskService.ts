import { completeDraftApprovalTask } from "@/src/modules/tasks/services/completeDraftApprovalTask";
import { deleteDraftApprovalTask } from "@/src/modules/tasks/services/deleteDraftApprovalTask";
import { ensureDraftApprovalTask } from "@/src/modules/tasks/services/ensureDraftApprovalTask";

import type { HandlerContext } from "../types/pipeline";
import { err, ok } from "../types/result";
import type { Result } from "../types/result";

type TaskOps = NonNullable<import("../types/pipeline").ExecResult["tasks"]>;

function isLegacyHouseSection(entityType: string) {
  return entityType === "house_section";
}

/**
 * N1 compatibility wrapper over legacy draft approval task services.
 *
 * Current legacy services are hardcoded to entity_type = "house_section".
 * Generic entityType support is intentionally left for N6, when legacy
 * house_sections flow is removed.
 */
export async function applyTaskOps(
  ctx: HandlerContext,
  tasks: TaskOps,
): Promise<Result<void>> {
  try {
    if (tasks.ensure) {
      if (isLegacyHouseSection(tasks.ensure.entityType)) {
        await ensureDraftApprovalTask({
          houseId: ctx.house.id,
          houseSectionId: tasks.ensure.entityId,
          title: tasks.ensure.title,
          createdBy: ctx.user.id,
        });
      } else {
        console.warn(
          `Skipping draft task ensure for unsupported entityType: ${tasks.ensure.entityType}`,
        );
      }
    }

    if (tasks.complete) {
      if (isLegacyHouseSection(tasks.complete.entityType)) {
        await completeDraftApprovalTask(tasks.complete.entityId, ctx.user.id);
      } else {
        console.warn(
          `Skipping draft task complete for unsupported entityType: ${tasks.complete.entityType}`,
        );
      }
    }

    if (tasks.delete) {
      if (isLegacyHouseSection(tasks.delete.entityType)) {
        await deleteDraftApprovalTask(tasks.delete.entityId, ctx.user.id);
      } else {
        console.warn(
          `Skipping draft task delete for unsupported entityType: ${tasks.delete.entityType}`,
        );
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(
      error instanceof Error
        ? error.message
        : "Не вдалося виконати операцію із задачею.",
      "INTERNAL",
    );
  }
}
