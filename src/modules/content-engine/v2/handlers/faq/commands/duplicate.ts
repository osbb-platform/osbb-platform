import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseFaq } from "../types";
import { insertFaqItems, normalizeFaqItems } from "./shared";

type DuplicatePayload = {
  sourceId?: unknown;
  targetHouseIds?: unknown;
};

function readDuplicatePayload(rawPayload: unknown) {
  const payload = rawPayload as DuplicatePayload;
  const sourceId = typeof payload.sourceId === "string" ? payload.sourceId.trim() : "";
  const targetHouseIds = Array.isArray(payload.targetHouseIds)
    ? payload.targetHouseIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (!sourceId) {
    return err("Не передано FAQ для копіювання.", "VALIDATION_FAILED");
  }

  if (targetHouseIds.length < 1) {
    return err("Оберіть хоча б один будинок для копіювання.", "VALIDATION_FAILED");
  }

  return ok({
    sourceId,
    targetHouseIds: Array.from(new Set(targetHouseIds.map((item) => item.trim()))),
  });
}

export const duplicateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payloadResult = readDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payloadResult = readDuplicatePayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const { sourceId, targetHouseIds } = payloadResult.data;

    const { data: source, error: sourceError } = await ctx.supabase
      .from("house_faq")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (sourceError) return err(sourceError.message, "INTERNAL");
    if (!source) return err("FAQ для копіювання не знайдено.", "NOT_FOUND");

    const sourceFaq = source as HouseFaq;

    const { data: sourceItems, error: sourceItemsError } = await ctx.supabase
      .from("house_faq_items")
      .select("question, answer, sort_order")
      .eq("faq_id", sourceId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (sourceItemsError) return err(sourceItemsError.message, "INTERNAL");

    const items = normalizeFaqItems(sourceItems ?? []);
    const created: Array<{ targetHouseId: string; createdId: string }> = [];
    const now = new Date().toISOString();

    for (const targetHouseId of targetHouseIds) {
      const { data, error } = await ctx.supabase
        .from("house_faq")
        .insert({
          house_id: targetHouseId,
          lifecycle_status: "draft",
          lock_version: 1,
          created_at: now,
          updated_at: now,
          published_at: null,
          archived_at: null,
        })
        .select("*")
        .single();

      if (error || !data) {
        return err(error?.message ?? "Не вдалося створити FAQ-копію.", "INTERNAL");
      }

      const faq = data as HouseFaq;
      const itemsResult = await insertFaqItems(ctx, faq.id, items);
      if (!itemsResult.ok) return itemsResult;

      created.push({
        targetHouseId,
        createdId: faq.id,
      });
    }

    return ok({
      data: {
        source: sourceFaq,
        created,
      },
      history: {
        entityType: "house_faq",
        entityId: sourceId,
        action: "duplicated_to_houses",
        description: `FAQ дубльовано в ${created.length} будинків.`,
        beforeSnapshot: sourceFaq,
        afterSnapshot: { created },
        metadata: {
          subSectionKey: "faq",
          targetHouseIds: created.map((item) => item.targetHouseId),
          createdIds: created.map((item) => item.createdId),
        },
      },
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
