import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  getActiveTemplate,
  readTemplateKey,
  type ContentTemplate,
} from "../../../services/templateService";
import type { HouseFaq } from "../types";
import { insertFaqItems, normalizeFaqItems } from "./shared";

type FaqTemplatePayload = {
  items?: unknown;
};

export const applyTemplateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const templateKey = readTemplateKey(rawPayload);
    if (!templateKey.ok) return templateKey;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as { templateKey: string };
    const templateResult = await getActiveTemplate<FaqTemplatePayload>(ctx.supabase, {
      sectionKey: "faq",
      templateKey: payload.templateKey,
    });

    if (!templateResult.ok) return templateResult;

    const template: ContentTemplate<FaqTemplatePayload> = templateResult.data;
    const items = normalizeFaqItems(template.payload.items);

    if (!items.length) {
      return err("У шаблоні немає коректних питань і відповідей.", "VALIDATION_FAILED");
    }

    const now = new Date().toISOString();

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
      return err(error?.message ?? "Не вдалося застосувати шаблон FAQ.", "INTERNAL");
    }

    const faq = data as HouseFaq;

    const itemsResult = await insertFaqItems(ctx, faq.id, items);
    if (!itemsResult.ok) return itemsResult;

    return ok({
      data: {
        ...faq,
        items,
      },
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "template_applied",
        description: `Створено FAQ-чернетку з шаблону «${template.title}».`,
        beforeSnapshot: null,
        afterSnapshot: {
          ...faq,
          items,
        },
        metadata: {
          subSectionKey: "faq",
          templateId: template.id,
          templateKey: template.templateKey,
          itemsCount: items.length,
        },
      },
    });
  },
};
