import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseSpecialist, UpdateSpecialistPayload } from "../types";
import {
  getSpecialist,
  HOUSE_SPECIALIST_ENTITY_TYPE,
  normalizeCategoryTitles,
  normalizeOptionalText,
  normalizePhones,
  normalizePhoneTypes,
  validatePhones,
  normalizeSortOrder,
  normalizeText,
  publicSpecialistsPaths,
  readIdAndLock,
  replaceSpecialistCategoryLinks,
  resolveSpecialistCategoryIds,
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

    if (normalizeCategoryTitles(payload).length === 0) {
      return err("Оберіть хоча б одну категорію спеціаліста.", "VALIDATION_FAILED");
    }

    const phones = validatePhones(payload.phones);
    if (!phones.ok) {
      return err("Введіть коректний номер телефону.", "VALIDATION_FAILED");
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
    const phones = normalizePhones(payload.phones);
    const categoryTitles = normalizeCategoryTitles(payload);

    const categoryIdsResult = await resolveSpecialistCategoryIds(ctx, ctx.house.id, categoryTitles);
    if (!categoryIdsResult.ok) return categoryIdsResult;

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .update({
        title: normalizeText(payload.title),
        category: categoryTitles[0] ?? "",
        phones,
        phone_types: normalizePhoneTypes(payload.phoneTypes, phones),
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

    const linkResult = await replaceSpecialistCategoryLinks(ctx, {
      houseId: ctx.house.id,
      specialistId: specialist.id,
      categoryIds: categoryIdsResult.data,
    });

    if (!linkResult.ok) return linkResult;

    return ok({
      data: { ...specialist, categories: categoryTitles },
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "updated",
        description: `Оновлено спеціаліста «${specialist.title}».`,
        beforeSnapshot: before,
        afterSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
          categories: categoryTitles,
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
