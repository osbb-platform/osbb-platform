import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  buildTemplateKey,
  readTemplateSectionKind,
  readTemplateSlotIndex,
  toTemplateSectionKey,
  type TemplateSectionKind,
} from "../../../services/templateService";

export function normalizeTemplateText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTemplatePayload(value: unknown): Result<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return err("Шаблон має містити коректний payload.", "VALIDATION_FAILED");
  }

  return ok(value as Record<string, unknown>);
}

export function readSectionAndSlot(rawPayload: unknown): Result<{
  sectionKind: TemplateSectionKind;
  sectionKey: ReturnType<typeof toTemplateSectionKey>;
  slotIndex: number;
  templateKey: string;
}> {
  const payload = rawPayload as Partial<{
    sectionKind: unknown;
    slotIndex: unknown;
  }>;

  const sectionKind = readTemplateSectionKind(payload.sectionKind);
  if (!sectionKind.ok) return sectionKind;

  const slotIndex = readTemplateSlotIndex(payload.slotIndex, sectionKind.data);
  if (!slotIndex.ok) return slotIndex;

  return ok({
    sectionKind: sectionKind.data,
    sectionKey: toTemplateSectionKey(sectionKind.data),
    slotIndex: slotIndex.data,
    templateKey: buildTemplateKey(sectionKind.data, slotIndex.data),
  });
}

export async function getTemplateBySlot(
  ctx: HandlerContext,
  params: {
    sectionKind: TemplateSectionKind;
    slotIndex: number;
  },
) {
  const { data, error } = await ctx.supabase
    .from("content_templates")
    .select("*")
    .eq("section_kind", params.sectionKind)
    .eq("slot_index", params.slotIndex)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok(data ?? null);
}
