import type { SupabaseClient } from "@supabase/supabase-js";

import type { CommandSpec } from "../../../types/handler";
import { err, ok, type Result } from "../../../types/result";
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
  INFORMATION_POST_COVER_FIELD_KEY,
  INFORMATION_POST_ENTITY_TYPE,
  isValidCategory,
  normalizeCoverImage,
} from "./shared";

type InformationPostsTemplatePayload = {
  posts?: unknown;
};

type TemplateCoverImage = {
  bucket: string;
  path: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
};

type NormalizedTemplatePost = {
  headline: string;
  body: string;
  category: InformationPostCategory;
  isPinned: boolean;
  coverImage: TemplateCoverImage | null;
};

function normalizeTemplateCoverImage(value: unknown): TemplateCoverImage | null {
  const coverImage = normalizeCoverImage(value);

  if (!coverImage) {
    return null;
  }

  return {
    bucket: coverImage.bucket,
    path: coverImage.path,
    originalName: coverImage.originalName ?? null,
    mimeType: coverImage.mimeType ?? null,
    size: coverImage.size ?? null,
  };
}

function getFileExtension(path: string, originalName: string | null) {
  const source = originalName || path;
  const match = source.match(/\.([a-z0-9]+)$/i);

  return match ? match[1].toLowerCase() : "jpg";
}

function buildTemplateCoverTargetPath(params: {
  houseId: string;
  postId: string;
  sourcePath: string;
  originalName: string | null;
}) {
  const extension = getFileExtension(params.sourcePath, params.originalName);
  return `${params.houseId}/information/${params.postId}/template-cover-${Date.now()}.${extension}`;
}

async function copyTemplateCoverImage(
  supabase: SupabaseClient,
  coverImage: TemplateCoverImage,
  targetPath: string,
): Promise<Result<TemplateCoverImage>> {
  const bucket = supabase.storage.from(coverImage.bucket);
  const copyCapableBucket = bucket as typeof bucket & {
    copy?: (
      fromPath: string,
      toPath: string,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  if (typeof copyCapableBucket.copy === "function") {
    const copyResult = await copyCapableBucket.copy(coverImage.path, targetPath);

    if (!copyResult.error) {
      return ok({
        ...coverImage,
        path: targetPath,
      });
    }

    console.warn("information template cover copy fallback to download/upload:", copyResult.error.message);
  }

  const downloadResult = await bucket.download(coverImage.path);

  if (downloadResult.error || !downloadResult.data) {
    return err(
      `Не вдалося скопіювати обкладинку шаблону ${coverImage.path}: ${
        downloadResult.error?.message ?? "файл недоступний"
      }`,
      "INTERNAL",
    );
  }

  const uploadResult = await bucket.upload(targetPath, downloadResult.data, {
    upsert: false,
    contentType: coverImage.mimeType ?? undefined,
  });

  if (uploadResult.error) {
    return err(
      `Не вдалося завантажити копію обкладинки шаблону ${coverImage.path}: ${uploadResult.error.message}`,
      "INTERNAL",
    );
  }

  return ok({
    ...coverImage,
    path: targetPath,
  });
}

function normalizeTemplatePosts(value: unknown): NormalizedTemplatePost[] {
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
        coverImage: normalizeTemplateCoverImage(record.coverImage),
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
    const filesToTrack = [];
    const copiedCoverPathsByBucket = new Map<string, string[]>();

    for (let index = 0; index < createdPosts.length; index += 1) {
      const coverImage = posts[index]?.coverImage ?? null;
      const createdPost = createdPosts[index];

      if (!coverImage || !createdPost) {
        continue;
      }

      const targetPath = buildTemplateCoverTargetPath({
        houseId: ctx.house.id,
        postId: createdPost.id,
        sourcePath: coverImage.path,
        originalName: coverImage.originalName,
      });

      const copiedCover = await copyTemplateCoverImage(
        ctx.supabase,
        coverImage,
        targetPath,
      );

      if (!copiedCover.ok) {
        for (const [bucket, paths] of copiedCoverPathsByBucket.entries()) {
          await ctx.supabase.storage.from(bucket).remove(paths);
        }

        return copiedCover;
      }

      const copiedPaths = copiedCoverPathsByBucket.get(copiedCover.data.bucket) ?? [];
      copiedPaths.push(copiedCover.data.path);
      copiedCoverPathsByBucket.set(copiedCover.data.bucket, copiedPaths);

      filesToTrack.push({
        entityType: INFORMATION_POST_ENTITY_TYPE,
        entityId: createdPost.id,
        fieldKey: INFORMATION_POST_COVER_FIELD_KEY,
        bucket: copiedCover.data.bucket,
        path: copiedCover.data.path,
        originalName: copiedCover.data.originalName,
        mimeType: copiedCover.data.mimeType,
        size: copiedCover.data.size,
      });
    }

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
      filesToTrack: filesToTrack.length > 0 ? filesToTrack : undefined,
      extraRevalidatePaths: [`/house/${ctx.house.slug}/information`],
    });
  },
};
