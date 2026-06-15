import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import type {
  FaqItemInput,
  FaqLockPayload,
  FaqTargetPayload,
  HouseFaq,
  HouseFaqItem,
} from "../types";

export function normalizeFaqItem(item: unknown): FaqItemInput | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question.trim() : "";
  const answer = typeof record.answer === "string" ? record.answer.trim() : "";

  if (!question || !answer) {
    return null;
  }

  return { question, answer };
}

export function normalizeFaqItems(value: unknown): FaqItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeFaqItem)
    .filter((item): item is FaqItemInput => item !== null)
    .slice(0, 50);
}

export function readFaqId(rawPayload: unknown): Result<string> {
  const payload = rawPayload as Partial<FaqTargetPayload>;

  if (typeof payload.faqId !== "string" || !payload.faqId.trim()) {
    return err("Не передано FAQ.", "VALIDATION_FAILED");
  }

  return ok(payload.faqId.trim());
}

export function readLockVersion(rawPayload: unknown): Result<number> {
  const payload = rawPayload as Partial<FaqLockPayload>;

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію FAQ.", "VALIDATION_FAILED");
  }

  return ok(payload.lockVersion);
}

export async function getHouseFaq(
  ctx: HandlerContext,
  faqId: string,
): Promise<Result<HouseFaq>> {
  const { data, error } = await ctx.supabase
    .from("house_faq")
    .select("*")
    .eq("house_id", ctx.house.id)
    .eq("id", faqId)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("FAQ не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseFaq);
}

export async function getHouseFaqItems(
  ctx: HandlerContext,
  faqId: string,
): Promise<Result<HouseFaqItem[]>> {
  const { data, error } = await ctx.supabase
    .from("house_faq_items")
    .select("*")
    .eq("faq_id", faqId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok((data ?? []) as HouseFaqItem[]);
}

export async function insertFaqItems(
  ctx: HandlerContext,
  faqId: string,
  items: FaqItemInput[],
): Promise<Result<void>> {
  if (items.length === 0) {
    return ok(undefined);
  }

  const { error } = await ctx.supabase.from("house_faq_items").insert(
    items.map((item, index) => ({
      faq_id: faqId,
      question: item.question,
      answer: item.answer,
      sort_order: index,
    })),
  );

  if (error) {
    return err(error.message, "INTERNAL");
  }

  return ok(undefined);
}

export function mapItemsForSnapshot(items: FaqItemInput[]) {
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}
