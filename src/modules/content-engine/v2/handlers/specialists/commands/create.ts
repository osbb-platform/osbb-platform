import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { CreateSpecialistPayload, HouseSpecialist } from "../types";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  normalizeCategoryTitles,
  normalizeOptionalText,
  normalizePhones,
  normalizePhoneTypes,
  validatePhones,
  normalizeSortOrder,
  normalizeText,
  publicSpecialistsPaths,
  replaceSpecialistCategoryLinks,
  resolveSpecialistCategoryIds,
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
    const payload = rawPayload as CreateSpecialistPayload;
    const now = new Date().toISOString();
    const phones = normalizePhones(payload.phones);
    const categoryTitles = normalizeCategoryTitles(payload);

    const categoryIdsResult = await resolveSpecialistCategoryIds(ctx, ctx.house.id, categoryTitles);
    if (!categoryIdsResult.ok) return categoryIdsResult;

    const { data, error } = await ctx.supabase
      .from("house_specialists")
      .insert({
        house_id: ctx.house.id,
        title: normalizeText(payload.title),
        // Primary/compatibility scalar: first selected category. Not removed
        // this release — legacy readers keep working unmodified.
        category: categoryTitles[0] ?? "",
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

    const linkResult = await replaceSpecialistCategoryLinks(ctx, {
      houseId: ctx.house.id,
      specialistId: specialist.id,
      categoryIds: categoryIdsResult.data,
    });

    if (!linkResult.ok) {
      await ctx.supabase.from("house_specialists").delete().eq("id", specialist.id);
      return linkResult;
    }

    return ok({
      data: { ...specialist, categories: categoryTitles },
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: specialist.id,
        action: "created",
        description: `Створено спеціаліста «${specialist.title}».`,
        afterSnapshot: specialist,
        metadata: specialistHistoryMetadata({
          category: specialist.category,
          categories: categoryTitles,
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
