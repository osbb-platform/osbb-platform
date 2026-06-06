import type { SupabaseClient } from "@supabase/supabase-js";

import type { FileRef } from "../types/pipeline";
import { err, ok } from "../types/result";
import type { Result } from "../types/result";

/**
 * Registers files in house_content_files.
 * Does not upload files: upload is already done client-side.
 */
export async function trackFiles(
  supabase: SupabaseClient,
  params: { entityType: string; entityId: string; files: FileRef[] },
): Promise<Result<void>> {
  if (!params.files.length) {
    return ok(undefined);
  }

  const rows = params.files.map((file) => ({
    entity_type: params.entityType,
    entity_id: params.entityId,
    field_key: file.fieldKey,
    storage_bucket: file.bucket,
    storage_path: file.path,
    original_file_name: file.originalName ?? null,
    mime_type: file.mimeType ?? null,
    size_bytes: file.size ?? null,
  }));

  const { error } = await supabase.from("house_content_files").insert(rows);

  if (error) {
    return err(`Не вдалося зареєструвати файл: ${error.message}`, "STORAGE_ERROR");
  }

  return ok(undefined);
}

/**
 * Removes files from Supabase Storage and house_content_files.
 */
export async function cleanupFiles(
  supabase: SupabaseClient,
  refs: { entityType: string; entityId: string; fieldKeys?: string[] }[],
): Promise<Result<void>> {
  for (const ref of refs) {
    let query = supabase
      .from("house_content_files")
      .select("id, storage_bucket, storage_path, field_key")
      .eq("entity_type", ref.entityType)
      .eq("entity_id", ref.entityId);

    if (ref.fieldKeys?.length) {
      query = query.in("field_key", ref.fieldKeys);
    }

    const { data: files, error: selectError } = await query;

    if (selectError) {
      return err(selectError.message, "STORAGE_ERROR");
    }

    if (!files?.length) {
      continue;
    }

    const byBucket = new Map<string, string[]>();

    for (const file of files) {
      const paths = byBucket.get(file.storage_bucket) ?? [];
      paths.push(file.storage_path);
      byBucket.set(file.storage_bucket, paths);
    }

    for (const [bucket, paths] of byBucket) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);

      if (removeError) {
        console.warn(`File cleanup warning for ${bucket}:`, removeError.message);
      }
    }

    const ids = files.map((file) => file.id);
    const { error: deleteError } = await supabase
      .from("house_content_files")
      .delete()
      .in("id", ids);

    if (deleteError) {
      return err(deleteError.message, "STORAGE_ERROR");
    }
  }

  return ok(undefined);
}
