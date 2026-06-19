import type { SupabaseClient } from "@supabase/supabase-js";

import { err, ok, type Result } from "../types/result";

export type TemplateSectionKey = "faq" | "specialists" | "information_posts";
export type TemplateSectionKind = "faq" | "specialists" | "information_post";

export const TEMPLATE_SLOT_LIMITS: Record<TemplateSectionKind, number> = {
  faq: 3,
  specialists: 10,
  information_post: 3,
};

export type ContentTemplate<TPayload extends Record<string, unknown>> = {
  id: string;
  sectionKey: TemplateSectionKey;
  sectionKind: TemplateSectionKind;
  templateKey: string;
  slotIndex: number;
  name: string;
  title: string;
  description: string;
  payload: TPayload;
  sortOrder: number;
  createdAt?: string;
};

type ContentTemplateRow = {
  id: string;
  section_key: TemplateSectionKey;
  section_kind: TemplateSectionKind | null;
  template_key: string;
  slot_index: number | null;
  name: string | null;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  sort_order: number | null;
  created_at?: string | null;
  is_active?: boolean | null;
};

export function readTemplateKey(rawPayload: unknown): Result<string> {
  const payload = rawPayload as Partial<{ templateKey: unknown }>;

  if (typeof payload.templateKey !== "string" || !payload.templateKey.trim()) {
    return err("Оберіть шаблон.", "VALIDATION_FAILED");
  }

  return ok(payload.templateKey.trim());
}

export function toTemplateSectionKey(sectionKind: TemplateSectionKind): TemplateSectionKey {
  return sectionKind === "information_post" ? "information_posts" : sectionKind;
}

export function toTemplateSectionKind(sectionKey: TemplateSectionKey): TemplateSectionKind {
  return sectionKey === "information_posts" ? "information_post" : sectionKey;
}

export function readTemplateSectionKind(value: unknown): Result<TemplateSectionKind> {
  if (value === "faq" || value === "specialists" || value === "information_post") {
    return ok(value);
  }

  return err("Некоректний розділ шаблону.", "VALIDATION_FAILED");
}

export function readTemplateSlotIndex(value: unknown, sectionKind: TemplateSectionKind): Result<number> {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue)) {
    return err("Некоректний номер слота шаблону.", "VALIDATION_FAILED");
  }

  const slotIndex = Number(numericValue);
  const limit = TEMPLATE_SLOT_LIMITS[sectionKind];

  if (slotIndex < 1 || slotIndex > limit) {
    return err(`Для цього розділу доступно слотів: ${limit}.`, "VALIDATION_FAILED");
  }

  return ok(slotIndex);
}

export function buildTemplateKey(sectionKind: TemplateSectionKind, slotIndex: number) {
  return `${sectionKind}_slot_${slotIndex}`;
}

function mapTemplateRow<TPayload extends Record<string, unknown>>(
  row: ContentTemplateRow,
): ContentTemplate<TPayload> {
  const sectionKind = row.section_kind ?? toTemplateSectionKind(row.section_key);
  const slotIndex = row.slot_index ?? Math.max(Math.trunc((row.sort_order ?? 10) / 10), 1);
  const name = row.name ?? row.title;

  return {
    id: row.id,
    sectionKey: row.section_key,
    sectionKind,
    templateKey: row.template_key,
    slotIndex,
    name,
    title: row.title,
    description: row.description ?? "",
    payload: row.payload as TPayload,
    sortOrder: row.sort_order ?? slotIndex * 10,
    createdAt: row.created_at ?? undefined,
  };
}

export async function getContentTemplates<TPayload extends Record<string, unknown>>(
  supabase: SupabaseClient,
  params: {
    sectionKind: TemplateSectionKind;
  },
): Promise<Result<Array<ContentTemplate<TPayload>>>> {
  const sectionKey = toTemplateSectionKey(params.sectionKind);

  const { data, error } = await supabase
    .from("content_templates")
    .select("id, section_key, section_kind, template_key, slot_index, name, title, description, payload, sort_order, created_at, is_active")
    .eq("section_key", sectionKey)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .order("slot_index", { ascending: true });

  if (error) {
    return err(`Не вдалося прочитати список шаблонів: ${error.message}`, "INTERNAL");
  }

  return ok(((data ?? []) as ContentTemplateRow[]).map(mapTemplateRow<TPayload>));
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
    .select("id, section_key, section_kind, template_key, slot_index, name, title, description, payload, sort_order, created_at")
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

  return ok(mapTemplateRow<TPayload>(row));
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
