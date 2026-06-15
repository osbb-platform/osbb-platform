import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  asArray,
  asRecord,
  getActiveTemplate,
  readString,
  readTemplateKey,
  uniqueStrings,
} from "../../../services/templateService";
import type { HouseSpecialist, HouseSpecialistCategory } from "../types";
import {
  HOUSE_SPECIALIST_ENTITY_TYPE,
  normalizeOptionalText,
  normalizePhones,
  normalizePhoneTypes,
  normalizeSortOrder,
  publicSpecialistsPaths,
  specialistHistoryMetadata,
} from "./shared";

type SpecialistsTemplatePayload = {
  categories?: unknown;
  specialists?: unknown;
};

function normalizeTemplateCategories(value: unknown) {
  return uniqueStrings(
    asArray(value).map((item) => readString(asRecord(item).title)),
  ).slice(0, 50);
}

function normalizeTemplateSpecialists(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const title = readString(record.title);

      if (!title) {
        return null;
      }

      return {
        title,
        category: normalizeOptionalText(record.category),
        phones: normalizePhones(record.phones),
        phone_types: normalizePhoneTypes(record.phoneTypes, normalizePhones(record.phones)),
        email: normalizeOptionalText(record.email),
        description: normalizeOptionalText(record.description),
        sortOrder:
          typeof record.sortOrder === "number"
            ? normalizeSortOrder(record.sortOrder)
            : index,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 50);
}

export const applyTemplateCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const templateKey = readTemplateKey(rawPayload);
    if (!templateKey.ok) return templateKey;

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const templateKey = readTemplateKey(rawPayload);
    if (!templateKey.ok) return templateKey;

    const templateResult = await getActiveTemplate<SpecialistsTemplatePayload>(
      ctx.supabase,
      {
        sectionKey: "specialists",
        templateKey: templateKey.data,
      },
    );

    if (!templateResult.ok) return templateResult;

    const template = templateResult.data;
    const templateCategories = normalizeTemplateCategories(template.payload.categories);
    const specialists = normalizeTemplateSpecialists(template.payload.specialists);

    if (!specialists.length) {
      return err("У шаблоні немає коректних спеціалістів.", "VALIDATION_FAILED");
    }

    const categoryTitles = uniqueStrings([
      ...templateCategories,
      ...specialists.map((specialist) => specialist.category).filter(Boolean),
    ]);

    const { data: beforeCategoriesData, error: beforeCategoriesError } =
      await ctx.supabase
        .from("house_specialists_categories")
        .select("*")
        .eq("house_id", ctx.house.id)
        .order("sort_order", { ascending: true });

    if (beforeCategoriesError) {
      return err(beforeCategoriesError.message, "INTERNAL");
    }

    const beforeCategories = (beforeCategoriesData ?? []) as HouseSpecialistCategory[];
    const existingCategoryKeys = new Set(
      beforeCategories.map((category) => category.title.toLowerCase()),
    );

    const categoriesToInsert = categoryTitles
      .filter((title) => !existingCategoryKeys.has(title.toLowerCase()))
      .map((title, index) => ({
        house_id: ctx.house.id,
        title,
        sort_order: beforeCategories.length + index,
      }));

    let createdCategories: HouseSpecialistCategory[] = [];

    if (categoriesToInsert.length) {
      const { data, error } = await ctx.supabase
        .from("house_specialists_categories")
        .insert(categoriesToInsert)
        .select("*");

      if (error) {
        return err(error.message, "INTERNAL");
      }

      createdCategories = (data ?? []) as HouseSpecialistCategory[];
    }

    const now = new Date().toISOString();

    const { data: createdData, error: createError } = await ctx.supabase
      .from("house_specialists")
      .insert(
        specialists.map((specialist) => ({
          house_id: ctx.house.id,
          title: specialist.title,
          category: specialist.category,
          phones: specialist.phones,
          phone_types: specialist.phone_types ?? [],
          email: specialist.email,
          description: specialist.description,
          sort_order: specialist.sortOrder,
          lifecycle_status: "draft",
          lock_version: 1,
          published_at: null,
          archived_at: null,
          created_at: now,
          updated_at: now,
        })),
      )
      .select("*");

    if (createError) {
      if (createdCategories.length) {
        const createdCategoryIds = createdCategories.map((category) => category.id);
        const { error: rollbackError } = await ctx.supabase
          .from("house_specialists_categories")
          .delete()
          .eq("house_id", ctx.house.id)
          .in("id", createdCategoryIds);

        if (rollbackError) {
          return err(
            `${createError.message} Нові категорії шаблону не вдалося відкотити: ${rollbackError.message}`,
            "INTERNAL",
          );
        }
      }

      return err(createError.message, "INTERNAL");
    }

    const createdSpecialists = (createdData ?? []) as HouseSpecialist[];

    return ok({
      data: {
        categories: createdCategories,
        specialists: createdSpecialists,
      },
      history: {
        entityType: HOUSE_SPECIALIST_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "template_applied",
        description: `Застосовано шаблон спеціалістів «${template.title}».`,
        beforeSnapshot: {
          categories: beforeCategories,
        },
        afterSnapshot: {
          categories: createdCategories,
          specialists: createdSpecialists,
        },
        metadata: specialistHistoryMetadata({
          templateId: template.id,
          templateKey: template.templateKey,
          categoriesCreated: createdCategories.length,
          specialistsCreated: createdSpecialists.length,
        }),
      },
      extraRevalidatePaths: publicSpecialistsPaths(ctx.house.slug),
    });
  },
};
