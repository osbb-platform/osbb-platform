import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateFaqPayload, HouseFaq } from "../types";
import { insertFaqItems, normalizeFaqItems } from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate() {
    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateFaqPayload;
    const now = new Date().toISOString();

    let sourceItems = [] as { question: string; answer: string }[];

    if (typeof payload.sourceFaqId === "string" && payload.sourceFaqId.trim()) {
      const { data: source, error: sourceError } = await ctx.supabase
        .from("house_faq")
        .select("id")
        .eq("house_id", ctx.house.id)
        .eq("id", payload.sourceFaqId.trim())
        .maybeSingle();

      if (sourceError) {
        return err(sourceError.message, "INTERNAL");
      }

      if (!source) {
        return err("FAQ для копіювання не знайдено.", "NOT_FOUND");
      }

      const { data: items, error: itemsError } = await ctx.supabase
        .from("house_faq_items")
        .select("question, answer, sort_order")
        .eq("faq_id", payload.sourceFaqId.trim())
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (itemsError) {
        return err(itemsError.message, "INTERNAL");
      }

      sourceItems = normalizeFaqItems(items ?? []);
    }

    const { data, error } = await ctx.supabase
      .from("house_faq")
      .insert({
        house_id: ctx.house.id,
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
      return err(error?.message ?? "Не вдалося створити FAQ.", "INTERNAL");
    }

    const faq = data as HouseFaq;

    const itemsResult = await insertFaqItems(ctx, faq.id, sourceItems);
    if (!itemsResult.ok) return itemsResult;

    return ok({
      data: {
        ...faq,
        items: sourceItems,
      },
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "created",
        description: "Створено FAQ-чернетку будинку.",
        beforeSnapshot: null,
        afterSnapshot: {
          ...faq,
          items: sourceItems,
        },
        metadata: {
          subSectionKey: "faq",
          copiedFromFaqId: payload.sourceFaqId ?? null,
          itemsCount: sourceItems.length,
        },
      },
    });
  },
};
