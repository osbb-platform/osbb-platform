import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  asArray,
  asRecord,
  getActiveTemplate,
  readBoolean,
  readString,
  readTemplateKey,
} from "../../../services/templateService";
import type { InformationPost, InformationPostCategory } from "../types";
import {
  INFORMATION_POST_ENTITY_TYPE,
  isValidCategory,
} from "./shared";

type InformationPostsTemplatePayload = {
  posts?: unknown;
};

function normalizeTemplatePosts(value: unknown) {
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      const headline = readString(record.headline);
      const body = readString(record.body);
      const category = readString(record.category);

      if (!headline || !body || !isValidCategory(category)) {
        return null;
      }

      return {
        headline,
        body,
        category: category as InformationPostCategory,
        isPinned: readBoolean(record.isPinned),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 20);
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

    const templateResult = await getActiveTemplate<InformationPostsTemplatePayload>(
      ctx.supabase,
      {
        sectionKey: "information_posts",
        templateKey: templateKey.data,
      },
    );

    if (!templateResult.ok) return templateResult;

    const template = templateResult.data;
    const posts = normalizeTemplatePosts(template.payload.posts);

    if (!posts.length) {
      return err(
        "У шаблоні немає коректних інформаційних матеріалів.",
        "VALIDATION_FAILED",
      );
    }

    const { data, error } = await ctx.supabase
      .from("house_information_posts")
      .insert(
        posts.map((post) => ({
          house_id: ctx.house.id,
          headline: post.headline,
          body: post.body,
          category: post.category,
          is_pinned: post.isPinned,
          lifecycle_status: "draft",
          created_by: ctx.user.id,
        })),
      )
      .select("*");

    if (error) {
      return err(error.message, "INTERNAL");
    }

    const createdPosts = (data ?? []) as InformationPost[];

    return ok({
      data: createdPosts,
      history: {
        entityType: INFORMATION_POST_ENTITY_TYPE,
        entityId: ctx.house.id,
        action: "template_applied",
        description: `Застосовано шаблон інформаційних матеріалів «${template.title}».`,
        afterSnapshot: createdPosts,
        metadata: {
          subSectionKey: "information_posts",
          templateId: template.id,
          templateKey: template.templateKey,
          postsCreated: createdPosts.length,
        },
      },
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
