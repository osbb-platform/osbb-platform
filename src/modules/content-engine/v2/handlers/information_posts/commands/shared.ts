import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  INFORMATION_POST_CATEGORIES,
  type InformationPost,
  type InformationPostCategory,
  type InformationPostFileInput,
  type InformationPostIdAndLock,
} from "../types";

export const INFORMATION_POST_ENTITY_TYPE = "house_information_post";
export const INFORMATION_POST_COVER_FIELD_KEY = "coverImage";

export function isValidCategory(value: unknown): value is InformationPostCategory {
  return (
    typeof value === "string" &&
    (INFORMATION_POST_CATEGORIES as readonly string[]).includes(value)
  );
}

export function readIdAndLock(rawPayload: unknown): Result<InformationPostIdAndLock> {
  const payload = rawPayload as Partial<InformationPostIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID інформаційного матеріалу.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію інформаційного матеріалу.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export function normalizeBoolean(value: unknown) {
  return value === true;
}

export function normalizeCoverImage(value: unknown): InformationPostFileInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
  const path = typeof record.path === "string" ? record.path.trim() : "";

  if (!bucket || !path) {
    return null;
  }

  return {
    bucket,
    path,
    originalName:
      typeof record.originalName === "string" ? record.originalName : null,
    mimeType: typeof record.mimeType === "string" ? record.mimeType : null,
    size: typeof record.size === "number" ? record.size : null,
  };
}

export async function getInformationPost(
  ctx: HandlerContext,
  id: string,
): Promise<Result<InformationPost>> {
  const { data, error } = await ctx.supabase
    .from("house_information_posts")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Інформаційний матеріал не знайдено.", "NOT_FOUND");
  }

  return ok(data as InformationPost);
}
