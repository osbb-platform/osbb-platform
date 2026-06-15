import type { HandlerContext } from "../../../types/pipeline";
import { err, ok, type Result } from "../../../types/result";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  type HouseSpecialist,
  type HouseSpecialistPhoneType,
  type SpecialistIdAndLock,
} from "../types";

export { HOUSE_SPECIALIST_ENTITY_TYPE };

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalText(value: unknown) {
  return normalizeText(value);
}

export function normalizePhones(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((phone) => normalizeText(phone))
    .filter(Boolean)
    .filter((phone, index, array) => array.indexOf(phone) === index);
}

export function normalizePhoneType(value: unknown): HouseSpecialistPhoneType {
  return value === "landline" || value === "free" ? value : "mobile";
}

export function normalizePhoneTypes(value: unknown, phones: string[]) {
  const rawTypes = Array.isArray(value) ? value : [];

  return phones.map((_, index) => normalizePhoneType(rawTypes[index]));
}

export function normalizeSortOrder(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function readIdAndLock(rawPayload: unknown): Result<SpecialistIdAndLock> {
  const payload = rawPayload as Partial<SpecialistIdAndLock>;

  if (!payload.id) {
    return err("Не передано ID спеціаліста.", "VALIDATION_FAILED");
  }

  if (typeof payload.lockVersion !== "number") {
    return err("Не передано версію спеціаліста.", "VALIDATION_FAILED");
  }

  return ok({
    id: payload.id,
    lockVersion: payload.lockVersion,
  });
}

export async function getSpecialist(
  ctx: HandlerContext,
  id: string,
): Promise<Result<HouseSpecialist>> {
  const { data, error } = await ctx.supabase
    .from("house_specialists")
    .select("*")
    .eq("id", id)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (error) {
    return err(error.message, "INTERNAL");
  }

  if (!data) {
    return err("Спеціаліста не знайдено.", "NOT_FOUND");
  }

  return ok(data as HouseSpecialist);
}

export function publicSpecialistsPaths(houseSlug: string) {
  return [`/house/${houseSlug}/specialists`];
}

export function specialistHistoryMetadata(extra?: Record<string, unknown>) {
  return {
    subSectionKey: "specialists",
    ...extra,
  };
}

export function specialistTaskTitle(specialist: HouseSpecialist) {
  return specialist.title || "Спеціаліст";
}
