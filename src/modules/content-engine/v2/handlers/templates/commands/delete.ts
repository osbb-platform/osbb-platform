import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import { CONTENT_TEMPLATE_ENTITY_TYPE } from "../types";
import { readSectionAndSlot } from "./shared";

export const deleteCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const sectionAndSlot = readSectionAndSlot(rawPayload);
    if (!sectionAndSlot.ok) return sectionAndSlot;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const sectionAndSlot = readSectionAndSlot(rawPayload);
    if (!sectionAndSlot.ok) return sectionAndSlot;

    const { data, error } = await ctx.supabase
      .from("content_templates")
      .delete()
      .eq("section_kind", sectionAndSlot.data.sectionKind)
      .eq("slot_index", sectionAndSlot.data.slotIndex)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Шаблон не знайдено.", "NOT_FOUND");
    }

    return ok({
      data,
      history: {
        entityType: CONTENT_TEMPLATE_ENTITY_TYPE,
        entityId: String(data.id),
        action: "template_deleted",
        description: `Видалено шаблон «${data.name ?? data.title ?? "Без назви"}».`,
        beforeSnapshot: data,
        afterSnapshot: null,
        metadata: {
          subSectionKey: "templates",
          sectionKind: sectionAndSlot.data.sectionKind,
          slotIndex: sectionAndSlot.data.slotIndex,
          templateKey: sectionAndSlot.data.templateKey,
        },
      },
    });
  },
};
