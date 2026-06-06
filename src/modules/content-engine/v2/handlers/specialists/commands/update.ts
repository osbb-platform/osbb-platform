import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseSpecialist, UpdateSpecialistPayload } from "../types";
import {
  getSpecialist,
  HOUSE_SPECIALIST_ENTITY_TYPE,
  normalizeOptionalText,
  normalizePhones,
  normalizeSortOrder,
  normalizeText,
  publicSpecialistsPaths,
  readIdAndLock,
  specialistHistoryMetadata,
  specialistTaskTitle,
} from "./shared";

export const updateCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const idAndLock = readIdAndLock(rawPayload);
    if (!idAndLock.ok) return idAndLock;

    const payload = rawPayload as Partial<UpdateSpecialistPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву спеціаліста.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as UpdateSpecialistPayload;
    const beforeResult = await getSpecialist(ctx, payload.id);

    if (!beforeResult.ok) {
      return beforeResult;
    }

    const before = beforeResult.data;
    const now = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .update({
        title: normalizeText(payload.title),
        category: normalizeOptionalText(payload.category),
        phones: normalizePhones(payload.phones),
        email: normalizeOptionalText(payload.email),
        description: normalizeOptionalText(payload.description),
        sort_order: normalizeSortOrder(payload.sortOrder),
        lock_version: payload.lockVersion + 1,
        updated_at: now,
      })
      .eq("id", payload.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const specialist = data as HouseSpecialist;

    return ok({
      data: specialist,
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "updated",
        description: `Оновлено спеціаліста «${specialist.title}».`,
        beforeSnapshot: before,
        afterSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
        }),
      },
      tasks:
        specialist.lifecycle_status === "draft"
          ? {
              ensure: {
                entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
                entityId: specialist.id,
                title: specialistTaskTitle(specialist),
              },
            }
          : undefined,
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
