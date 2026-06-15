import type { CommandSpec } from "../../../types/handler";
import {
  duplicateTableRecordToDraft,
  parseDuplicatePayload,
  validateDuplicatePayload,
} from "../../../services/cloneService";
import { ok } from "../../../types/result";
import type { InformationPost } from "../types";
import { INFORMATION_POST_COVER_FIELD_KEY } from "./shared";

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    return validateDuplicatePayload(rawPayload);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = parseDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const result = await duplicateTableRecordToDraft<InformationPost>({
      ctx,
      sourceTable: "house_information_posts",
      entityType: "house_information_post",
      sourceId: payloadResult.data.sourceId,
      targetHouseIds: payloadResult.data.targetHouseIds,
      sourceTitle: (source) => source.headline,
      buildInsert: ({ source, targetHouse, newId, actor }) => ({
        id: newId,
        house_id: targetHouse.id,
        headline: source.headline,
        body: source.body,
        category: source.category,
        is_pinned: source.is_pinned,
        lifecycle_status: "draft",
        published_at: null,
        archived_at: null,
        created_by: actor.id,
      }),
      targetDescription: ({ source }) =>
        `Створено чернетку інформаційного матеріалу «${source.headline}» з дублювання.`,
      historyMetadata: {
        subSectionKey: "information_posts",
        copiedFileFieldKey: INFORMATION_POST_COVER_FIELD_KEY,
      },
      publicPathsForHouse: (houseSlug) => [`/house/${houseSlug}/information`],
    });

    if (!result.ok) return result;

    return ok({
      data: result.data,
      history: {
        entityType: "house_information_post",
        entityId: payloadResult.data.sourceId,
        action: "duplicated_to_houses",
        description: `Інформаційний матеріал «${result.data.source.headline}» дубльовано в ${result.data.created.length} будинків.`,
        beforeSnapshot: result.data.source,
        afterSnapshot: { created: result.data.created },
        metadata: {
          subSectionKey: "information_posts",
          targetHouseIds: result.data.created.map((item) => item.targetHouseId),
          createdIds: result.data.created.map((item) => item.createdId),
        },
      },
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
