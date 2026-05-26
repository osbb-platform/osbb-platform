import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import type { FaqItemInput, FaqLockPayload, HouseFaq } from "../types";

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

export function readLockVersion(rawPayload: unknown): Result<number> {
  const payload = rawPayload as Partial<FaqLockPayload>;

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію FAQ.", "VALIDATION_FAILED");
  }

  return ok(payload.lockVersion);
}

export async function getHouseFaq(ctx: HandlerContext): Promise<Result<HouseFaq>> {
  const { data, error } = await ctx.supabase
    .from("house_faq")
    .select("*")
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("FAQ ще не створено.", "NOT_FOUND");
  }

  return ok(data as HouseFaq);
}
