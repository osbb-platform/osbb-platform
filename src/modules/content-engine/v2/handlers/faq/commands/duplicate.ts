import type { CommandSpec } from "../../../types/handler";
import {
  duplicateFaqToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    return validateDuplicatePayload(rawPayload);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = parseDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const result = await duplicateFaqToDraft(ctx, payloadResult.data);
    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: "house_faq",
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `FAQ дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: {
          subSectionKey: "faq",
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        },
      },
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
