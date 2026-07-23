import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  logOptionalPublicReadError,
  throwRequiredPublicReadError,
} from "./publicContentResilience";
import type { InformationPost } from "@/src/modules/content-engine/v2/handlers/information_posts";
import type { HouseInformationPostSnapshot } from "./getAdminHouseInformationPosts";

type HouseContentFileRow = {
  entity_id: string;
  storage_bucket: string;
  storage_path: string;
};

function buildPublicStorageUrl(row: HouseContentFileRow) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${row.storage_bucket}/${row.storage_path}`;
}

function mapPost(
  post: InformationPost,
  coverFilesByEntityId: Map<string, HouseContentFileRow>,
): HouseInformationPostSnapshot {
  const coverFile = coverFilesByEntityId.get(post.id);
  const coverImageUrl = coverFile ? buildPublicStorageUrl(coverFile) : null;

  return {
    id: post.id,
    title: post.headline,
    status: post.lifecycle_status,
    lockVersion: post.lock_version,
    content: {
      headline: post.headline,
      body: post.body,
      category: post.category,
      isPinned: post.is_pinned,
      coverImageUrl,
      coverImage: null,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      archivedAt: post.archived_at,
      lockVersion: post.lock_version,
    },
  };
}

async function loadPublishedHouseInformationPosts(
  houseId: string,
): Promise<HouseInformationPostSnapshot[]> {
  const supabase = createSupabasePublicClient();

  const { data: posts, error: postsError } = await supabase
    .from("house_information_posts")
    .select("*")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false });

  if (postsError) {
    throwRequiredPublicReadError({
      section: "information",
      resource: "house_information_posts",
      houseId,
      error: postsError,
    });
  }

  const typedPosts = (posts ?? []) as unknown as InformationPost[];
  const postIds = typedPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return [];
  }

  const { data: files, error: filesError } = await supabase
    .from("house_content_files")
    .select("entity_id, storage_bucket, storage_path")
    .eq("entity_type", "house_information_post")
    .eq("field_key", "coverImage")
    .in("entity_id", postIds);

  if (filesError) {
    logOptionalPublicReadError({
      section: "information",
      resource: "house_content_files",
      houseId,
      error: filesError,
    });

    return typedPosts.map((post) => mapPost(post, new Map()));
  }

  const coverFilesByEntityId = new Map<string, HouseContentFileRow>();

  for (const file of (files ?? []) as HouseContentFileRow[]) {
    coverFilesByEntityId.set(file.entity_id, file);
  }

  return typedPosts.map((post) => mapPost(post, coverFilesByEntityId));
}

export const getPublishedHouseInformationPosts = cache(
  async (houseId: string): Promise<HouseInformationPostSnapshot[]> => {
    return unstable_cache(
      () => loadPublishedHouseInformationPosts(houseId),
      ["published-house-information-posts-v2", houseId],
      {
        tags: [`house:${houseId}:information_posts`, `house:${houseId}:information`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
