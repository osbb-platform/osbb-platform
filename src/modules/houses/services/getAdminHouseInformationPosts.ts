import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  InformationPost,
  InformationPostLifecycle,
} from "@/src/modules/content-engine/v2/handlers/information_posts";

export type HouseInformationPostSnapshot = {
  id: string;
  title: string;
  status: InformationPostLifecycle;
  lockVersion: number;
  content: {
    headline: string;
    body: string;
    category: string;
    isPinned: boolean;
    coverImageUrl: string | null;
    coverImage: {
      bucket: string;
      path: string;
      originalName: string | null;
      mimeType: string | null;
      size: number | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    archivedAt: string | null;
    lockVersion: number;
  };
};

type HouseContentFileRow = {
  entity_id: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
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
  const coverImage = coverFile
    ? {
        bucket: coverFile.storage_bucket,
        path: coverFile.storage_path,
        originalName: coverFile.original_file_name,
        mimeType: coverFile.mime_type,
        size: coverFile.size_bytes,
      }
    : null;

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
      coverImage,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at,
      archivedAt: post.archived_at,
      lockVersion: post.lock_version,
    },
  };
}

export async function getAdminHouseInformationPosts(params: {
  houseId: string;
}): Promise<HouseInformationPostSnapshot[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: posts, error: postsError } = await supabase
    .from("house_information_posts")
    .select("*")
    .eq("house_id", params.houseId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (postsError) {
    console.error("Failed to load admin information posts:", postsError.message);
    return [];
  }

  const typedPosts = (posts ?? []) as unknown as InformationPost[];
  const postIds = typedPosts.map((post) => post.id);

  if (postIds.length === 0) {
    return [];
  }

  const { data: files, error: filesError } = await supabase
    .from("house_content_files")
    .select("entity_id, storage_bucket, storage_path, original_file_name, mime_type, size_bytes")
    .eq("entity_type", "house_information_post")
    .eq("field_key", "coverImage")
    .in("entity_id", postIds);

  if (filesError) {
    console.error("Failed to load admin information post files:", filesError.message);
  }

  const coverFilesByEntityId = new Map<string, HouseContentFileRow>();

  for (const file of (files ?? []) as HouseContentFileRow[]) {
    coverFilesByEntityId.set(file.entity_id, file);
  }

  return typedPosts.map((post) => mapPost(post, coverFilesByEntityId));
}
