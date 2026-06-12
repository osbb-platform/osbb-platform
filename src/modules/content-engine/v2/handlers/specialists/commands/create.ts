import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateSpecialistPayload, HouseSpecialist } from "../types";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  normalizeOptionalText,
  normalizePhones,
  normalizePhoneTypes,
  normalizeSortOrder,
  normalizeText,
  publicSpecialistsPaths,
  specialistHistoryMetadata,
  specialistTaskTitle,
} from "./shared";

export const createCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<CreateSpecialistPayload>;

    if (!payload.title?.trim()) {
      return err("Заповніть назву спеціаліста.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as CreateSpecialistPayload;
    const now = new Date().toISOString();
    const phones = normalizePhones(payload.phones);

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .insert({
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        category: normalizeOptionalText(payload.category),
        phones,
        phone_types: normalizePhoneTypes(payload.phoneTypes, phones),
        email: normalizeOptionalText(payload.email),
        description: normalizeOptionalText(payload.description),
        sort_order: normalizeSortOrder(payload.sortOrder),
        lifecycle_status: "draft",
        lock_version: 1,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      return err(error?.message ?? "Не вдалося створити спеціаліста.", "INTERNAL");
    }

    const specialist = data as HouseSpecialist;

    return ok({
      data: specialist,
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "created",
        description: `Створено спеціаліста «${specialist.title}».`,
        afterSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
        }),
      },
      tasks: {
        ensure: {
          entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
          entityId: specialist.id,
          title: specialistTaskTitle(specialist),
        },
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
