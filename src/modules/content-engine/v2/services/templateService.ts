import type { SupabaseClient } from "@supabase/supabase-js";

import { err, ok, type Result } from "../types/result";

export type TemplateSectionKey = "faq" | "specialists" | "information_posts";

export type ContentTemplate<TPayload extends Record<string, unknown>> = {
  id: string;
  sectionKey: TemplateSectionKey;
  templateKey: string;
  title: string;
  description: string;
  payload: TPayload;
  sortOrder: number;
};

type ContentTemplateRow = {
  id: string;
  section_key: TemplateSectionKey;
  template_key: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  sort_order: number | null;
};

export function readTemplateKey(rawPayload: unknown): Result<string> {
  const payload = rawPayload as Partial<{ templateKey: unknown }>;

  if (typeof payload.templateKey !== "string" || !payload.templateKey.trim()) {
    return err("Оберіть шаблон.", "VALIDATION_FAILED");
  }

  return ok(payload.templateKey.trim());
}

export async function getActiveTemplate<TPayload extends Record<string, unknown>>(
  supabase: SupabaseClient,
  params: {
    sectionKey: TemplateSectionKey;
    templateKey: string;
  },
): Promise<Result<ContentTemplate<TPayload>>> {
  const { data, error } = await supabase
    .from("content_templates")
    .select("id, section_key, template_key, title, description, payload, sort_order")
    .eq("section_key", params.sectionKey)
    .eq("template_key", params.templateKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return err(`Не вдалося прочитати шаблон: ${error.message}`, "INTERNAL");
  }

  if (!data) {
    return err("Шаблон не знайдено або він вимкнений.", "NOT_FOUND");
  }

  const row = data as ContentTemplateRow;

  return ok({
    id: row.id,
    sectionKey: row.section_key,
    templateKey: row.template_key,
    title: row.title,
    description: row.description ?? "",
    payload: row.payload as TPayload,
    sortOrder: row.sort_order ?? 0,
  });
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readBoolean(value: unknown) {
  return value === true;
}

export function uniqueStrings(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => {
      const key = value.toLowerCase();
      return array.findIndex((item) => item.toLowerCase() === key) === index;
    });
}
