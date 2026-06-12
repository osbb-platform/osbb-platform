import type { TemplateSectionKind } from "../../services/templateService";

export const CONTENT_TEMPLATE_ENTITY_TYPE = "content_template";

export type UpsertTemplatePayload = {
  sectionKind: TemplateSectionKind;
  slotIndex: number;
  name: string;
  description?: string;
  payload: Record<string, unknown>;
};

export type DeleteTemplatePayload = {
  sectionKind: TemplateSectionKind;
  slotIndex: number;
};
