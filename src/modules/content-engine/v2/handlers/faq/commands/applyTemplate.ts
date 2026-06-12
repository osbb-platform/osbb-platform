import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  getActiveTemplate,
  readTemplateKey,
  type ContentTemplate,
} from "../../../services/templateService";
import type { HouseFaq, ReplaceFaqItemsPayload } from "../types";
import { getHouseFaq, normalizeFaqItems, readLockVersion } from "./shared";

type FaqTemplatePayload = {
  items?: unknown;
};

export const applyTemplateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const templateKey = readTemplateKey(rawPayload);
    if (!templateKey.ok) return templateKey;

    const lockVersion = readLockVersion(rawPayload);
    if (!lockVersion.ok) return lockVersion;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as ReplaceFaqItemsPayload & { templateKey: string };
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

    const beforeResult = await getHouseFaq(ctx);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;

    const { data, error } = await ctx.supabase.rpc("replace_house_faq_items", {
      p_house_id: ctx.house.id,
      p_lock_version: payload.lockVersion,
      p_items: items,
    });

    if (error) {
      if (error.message.includes("STALE_CONTENT")) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      if (error.message.includes("FAQ_NOT_FOUND")) {
        return err("FAQ ще не створено.", "NOT_FOUND");
      }

      return err(error.message, "INTERNAL");
    }

    const faq = data as HouseFaq;

    return ok({
      data: faq,
      history: {
        entityType: "house_faq",
        entityId: faq.id,
        action: "template_applied",
        description: `Застосовано шаблон FAQ «${template.title}».`,
        beforeSnapshot: before,
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
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
