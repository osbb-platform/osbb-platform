import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import { CONTENT_TEMPLATE_ENTITY_TYPE, type UpsertTemplatePayload } from "../types";
import {
  getTemplateBySlot,
  normalizeTemplatePayload,
  normalizeTemplateText,
  readSectionAndSlot,
} from "./shared";

export const upsertCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const sectionAndSlot = readSectionAndSlot(rawPayload);
    if (!sectionAndSlot.ok) return sectionAndSlot;

    const payload = rawPayload as Partial<UpsertTemplatePayload>;

    if (!normalizeTemplateText(payload.name)) {
      return err("Вкажіть назву шаблону.", "VALIDATION_FAILED");
    }

    const templatePayload = normalizeTemplatePayload(payload.payload);
    if (!templatePayload.ok) return templatePayload;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpsertTemplatePayload;
    const sectionAndSlot = readSectionAndSlot(rawPayload);
    if (!sectionAndSlot.ok) return sectionAndSlot;

    const beforeResult = await getTemplateBySlot(ctx, {
      sectionKind: sectionAndSlot.data.sectionKind,
      slotIndex: sectionAndSlot.data.slotIndex,
    });

    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const name = normalizeTemplateText(payload.name);
    const description = normalizeTemplateText(payload.description);
    const templatePayload = normalizeTemplatePayload(payload.payload);
    if (!templatePayload.ok) return templatePayload;

    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("content_templates")
      .upsert(
        {
          section_key: sectionAndSlot.data.sectionKey,
          section_kind: sectionAndSlot.data.sectionKind,
          template_key: sectionAndSlot.data.templateKey,
          slot_index: sectionAndSlot.data.slotIndex,
          name,
          title: name,
          description,
          payload: templatePayload.data,
          sort_order: sectionAndSlot.data.slotIndex * 10,
          is_active: true,
          created_by: ctx.user.id,
          updated_at: now,
        },
        {
          onConflict: "section_kind,slot_index",
        },
      )
      .select("*")
      .single();

    if (error || !data) {
      return err(error?.message ?? "Не вдалося зберегти шаблон.", "INTERNAL");
    }

    return ok({
      data,
      history: {
        entityType: CONTENT_TEMPLATE_ENTITY_TYPE,
        entityId: String(data.id),
        action: before ? "template_updated" : "template_created",
        description: before
          ? `Оновлено шаблон «${name}».`
          : `Створено шаблон «${name}».`,
        beforeSnapshot: before,
        afterSnapshot: data,
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
