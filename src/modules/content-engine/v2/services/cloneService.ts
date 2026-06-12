import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { writeHistory } from "./historyService";
import type { HandlerContext } from "../types/pipeline";
import { err, ok, type Result } from "../types/result";

export type TargetHouse = {
  id: string;
  slug: string;
  name: string;
};

export type CopiedFileRef = {
  fieldKey: string;
  bucket: string;
  path: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
};

export type DuplicateTargetResult = {
  targetHouseId: string;
  targetHouseName: string;
  createdId: string;
};

type Actor = HandlerContext["user"];

type TrackedFileRow = {
  id: string;
  field_key: string;
  storage_bucket: string;
  storage_path: string;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
};

type BuildInsertArgs<TSource extends object> = {
  source: TSource;
  targetHouse: TargetHouse;
  newId: string;
  now: string;
  actor: Actor;
  copiedFiles: CopiedFileRef[];
};

type DuplicateTableRecordParams<TSource extends object> = {
  ctx: HandlerContext;
  sourceTable: string;
  entityType: string;
  sourceId: string;
  targetHouseIds: string[];
  sourceTitle: (source: TSource) => string;
  buildInsert: (args: BuildInsertArgs<TSource>) => Record<string, unknown>;
  targetDescription: (args: {
    source: TSource;
    targetHouse: TargetHouse;
  }) => string;
  historyMetadata?: Record<string, unknown>;
  publicPathsForHouse?: (houseSlug: string) => string[];
};

type DuplicateResult<TSource extends object> = {
  source: TSource;
  created: DuplicateTargetResult[];
};

function readDuplicatePayload(rawPayload: unknown): Result<{
  sourceId: string;
  targetHouseIds: string[];
}> {
  const payload = rawPayload as Partial<{
    sourceId: unknown;
    targetHouseIds: unknown;
  }>;

  if (typeof payload.sourceId !== "string" || !payload.sourceId.trim()) {
    return err("Не передано ID запису для дублювання.", "VALIDATION_FAILED");
  }

  if (!Array.isArray(payload.targetHouseIds)) {
    return err("Не передано список будинків для дублювання.", "VALIDATION_FAILED");
  }

  const targetHouseIds = payload.targetHouseIds
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);

  if (!targetHouseIds.length) {
    return err("Оберіть щонайменше один будинок.", "VALIDATION_FAILED");
  }

  return ok({
    sourceId: payload.sourceId.trim(),
    targetHouseIds,
  });
}

export function validateDuplicatePayload(rawPayload: unknown): Result<void> {
  const payload = readDuplicatePayload(rawPayload);
  if (!payload.ok) return payload;

  return ok(undefined);
}

export function parseDuplicatePayload(rawPayload: unknown) {
  return readDuplicatePayload(rawPayload);
}

async function loadTargetHouses(
  supabase: SupabaseClient,
  targetHouseIds: string[],
): Promise<Result<TargetHouse[]>> {
  const { data, error } = await supabase
    .from("houses")
    .select("id, slug, name")
    .in("id", targetHouseIds);

  if (error) {
    return err(`Не вдалося перевірити будинки: ${error.message}`, "INTERNAL");
  }

  const houses = (data ?? []) as TargetHouse[];
  const foundIds = new Set(houses.map((house) => house.id));
  const missingIds = targetHouseIds.filter((id) => !foundIds.has(id));

  if (missingIds.length) {
    return err(
      "Частина будинків недоступна або не існує. Оновіть список будинків і повторіть дію.",
      "FORBIDDEN",
    );
  }

  return ok(
    targetHouseIds
      .map((id) => houses.find((house) => house.id === id))
      .filter((house): house is TargetHouse => Boolean(house)),
  );
}

async function loadTrackedFiles(
  supabase: SupabaseClient,
  params: { entityType: string; entityId: string },
): Promise<Result<TrackedFileRow[]>> {
  const { data, error } = await supabase
    .from("house_content_files")
    .select(
      "id, field_key, storage_bucket, storage_path, original_file_name, mime_type, size_bytes",
    )
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId);

  if (error) {
    return err(`Не вдалося прочитати файли запису: ${error.message}`, "STORAGE_ERROR");
  }

  return ok((data ?? []) as TrackedFileRow[]);
}

function extensionFromPath(path: string) {
  const fileName = path.split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0) return "";

  const extension = fileName.slice(dotIndex).replace(/[^a-zA-Z0-9.]/g, "");
  return extension.length <= 12 ? extension : "";
}

function createCopiedStoragePath(params: {
  sourcePath: string;
  targetHouseId: string;
  targetEntityId: string;
  fieldKey: string;
}) {
  return [
    params.targetHouseId,
    "duplicates",
    params.targetEntityId,
    `${params.fieldKey}-${Date.now()}-${randomUUID()}${extensionFromPath(params.sourcePath)}`,
  ].join("/");
}

async function copyStorageObject(
  supabase: SupabaseClient,
  file: TrackedFileRow,
  targetHouseId: string,
  targetEntityId: string,
): Promise<Result<CopiedFileRef>> {
  const targetPath = createCopiedStoragePath({
    sourcePath: file.storage_path,
    targetHouseId,
    targetEntityId,
    fieldKey: file.field_key,
  });

  const bucket = supabase.storage.from(file.storage_bucket);
  const copyCapableBucket = bucket as typeof bucket & {
    copy?: (
      fromPath: string,
      toPath: string,
    ) => Promise<{ error: { message: string } | null }>;
  };

  if (typeof copyCapableBucket.copy === "function") {
    const copyResult = await copyCapableBucket.copy(file.storage_path, targetPath);

    if (!copyResult.error) {
      return ok({
        fieldKey: file.field_key,
        bucket: file.storage_bucket,
        path: targetPath,
        originalName: file.original_file_name,
        mimeType: file.mime_type,
        size: file.size_bytes,
      });
    }

    console.warn("storage copy fallback to download/upload:", copyResult.error.message);
  }

  const downloadResult = await bucket.download(file.storage_path);

  if (downloadResult.error || !downloadResult.data) {
    return err(
      `Не вдалося скопіювати файл ${file.storage_path}: ${
        downloadResult.error?.message ?? "невідома помилка"
      }`,
      "STORAGE_ERROR",
    );
  }

  const uploadResult = await bucket.upload(targetPath, downloadResult.data, {
    contentType: file.mime_type ?? undefined,
    upsert: false,
  });

  if (uploadResult.error) {
    return err(
      `Не вдалося завантажити копію файлу ${file.storage_path}: ${uploadResult.error.message}`,
      "STORAGE_ERROR",
    );
  }

  return ok({
    fieldKey: file.field_key,
    bucket: file.storage_bucket,
    path: targetPath,
    originalName: file.original_file_name,
    mimeType: file.mime_type,
    size: file.size_bytes,
  });
}

async function cleanupCopiedFiles(
  supabase: SupabaseClient,
  files: CopiedFileRef[],
) {
  const byBucket = new Map<string, string[]>();

  for (const file of files) {
    const paths = byBucket.get(file.bucket) ?? [];
    paths.push(file.path);
    byBucket.set(file.bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      console.warn("duplicate cleanup copied files warning:", error.message);
    }
  }
}

async function copyTrackedFiles(
  supabase: SupabaseClient,
  params: {
    files: TrackedFileRow[];
    targetHouseId: string;
    targetEntityId: string;
  },
): Promise<Result<CopiedFileRef[]>> {
  const copied: CopiedFileRef[] = [];

  for (const file of params.files) {
    const copyResult = await copyStorageObject(
      supabase,
      file,
      params.targetHouseId,
      params.targetEntityId,
    );

    if (!copyResult.ok) {
      await cleanupCopiedFiles(supabase, copied);
      return copyResult;
    }

    copied.push(copyResult.data);
  }

  return ok(copied);
}

async function registerCopiedFiles(
  supabase: SupabaseClient,
  params: {
    entityType: string;
    entityId: string;
    files: CopiedFileRef[];
  },
): Promise<Result<void>> {
  if (!params.files.length) {
    return ok(undefined);
  }

  const { error } = await supabase.from("house_content_files").insert(
    params.files.map((file) => ({
      entity_type: params.entityType,
      entity_id: params.entityId,
      field_key: file.fieldKey,
      storage_bucket: file.bucket,
      storage_path: file.path,
      original_file_name: file.originalName,
      mime_type: file.mimeType,
      size_bytes: file.size,
    })),
  );

  if (error) {
    return err(`Не вдалося зареєструвати копії файлів: ${error.message}`, "STORAGE_ERROR");
  }

  return ok(undefined);
}

async function cleanupInsertedRecord(
  supabase: SupabaseClient,
  params: { table: string; id: string },
) {
  const { error } = await supabase.from(params.table).delete().eq("id", params.id);

  if (error) {
    console.warn("duplicate cleanup inserted record warning:", error.message);
  }
}

async function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`duplicate revalidate warning for ${path}:`, error);
    }
  }
}

export async function duplicateTableRecordToDraft<TSource extends object>(
  params: DuplicateTableRecordParams<TSource>,
): Promise<Result<DuplicateResult<TSource>>> {
  const targetHousesResult = await loadTargetHouses(
    params.ctx.supabase,
    params.targetHouseIds,
  );

  if (!targetHousesResult.ok) return targetHousesResult;

  const { data: sourceRaw, error: sourceError } = await params.ctx.supabase
    .from(params.sourceTable)
    .select("*")
    .eq("id", params.sourceId)
    .eq("house_id", params.ctx.house.id)
    .maybeSingle();

  if (sourceError) {
    return err(sourceError.message, "INTERNAL");
  }

  if (!sourceRaw) {
    return err("Запис для дублювання не знайдено.", "NOT_FOUND");
  }

  const source = sourceRaw as TSource;
  const filesResult = await loadTrackedFiles(params.ctx.supabase, {
    entityType: params.entityType,
    entityId: params.sourceId,
  });

  if (!filesResult.ok) return filesResult;

  const created: DuplicateTargetResult[] = [];

  for (const targetHouse of targetHousesResult.data) {
    const newId = randomUUID();
    const copiedFilesResult = await copyTrackedFiles(params.ctx.supabase, {
      files: filesResult.data,
      targetHouseId: targetHouse.id,
      targetEntityId: newId,
    });

    if (!copiedFilesResult.ok) {
      return copiedFilesResult;
    }

    const copiedFiles = copiedFilesResult.data;
    const now = new Date().toISOString();
    let insertPayload: Record<string, unknown>;

    try {
      insertPayload = params.buildInsert({
        source,
        targetHouse,
        newId,
        now,
        actor: params.ctx.user,
        copiedFiles,
      });
    } catch (error) {
      await cleanupCopiedFiles(params.ctx.supabase, copiedFiles);
      return err(
        error instanceof Error ? error.message : "Не вдалося підготувати дублікат.",
        "INTERNAL",
      );
    }

    const { data: inserted, error: insertError } = await params.ctx.supabase
      .from(params.sourceTable)
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      await cleanupCopiedFiles(params.ctx.supabase, copiedFiles);
      return err(
        `Не вдалося створити дублікат у будинку «${targetHouse.name}»: ${
          insertError?.message ?? "невідома помилка"
        }`,
        "INTERNAL",
      );
    }

    const registerFilesResult = await registerCopiedFiles(params.ctx.supabase, {
      entityType: params.entityType,
      entityId: newId,
      files: copiedFiles,
    });

    if (!registerFilesResult.ok) {
      await cleanupInsertedRecord(params.ctx.supabase, {
        table: params.sourceTable,
        id: newId,
      });
      await cleanupCopiedFiles(params.ctx.supabase, copiedFiles);
      return registerFilesResult;
    }

    created.push({
      targetHouseId: targetHouse.id,
      targetHouseName: targetHouse.name,
      createdId: newId,
    });

    await writeHistory(params.ctx.supabase, {
      actor: params.ctx.user,
      houseId: targetHouse.id,
      entry: {
        entityType: params.entityType,
        entityId: newId,
        action: "duplicated_created",
        description: params.targetDescription({ source, targetHouse }),
        beforeSnapshot: null,
        afterSnapshot: inserted,
        metadata: {
          ...(params.historyMetadata ?? {}),
          sourceHouseId: params.ctx.house.id,
          sourceEntityId: params.sourceId,
          sourceTitle: params.sourceTitle(source),
        },
      },
    });

    if (params.publicPathsForHouse) {
      await safeRevalidate(params.publicPathsForHouse(targetHouse.slug));
    }
  }

  return ok({ source, created });
}

export async function duplicateFaqToDraft(
  ctx: HandlerContext,
  params: { sourceId: string; targetHouseIds: string[] },
): Promise<Result<DuplicateResult<Record<string, unknown>>>> {
  const targetHousesResult = await loadTargetHouses(ctx.supabase, params.targetHouseIds);
  if (!targetHousesResult.ok) return targetHousesResult;

  const { data: sourceFaq, error: sourceError } = await ctx.supabase
    .from("house_faq")
    .select("*")
    .eq("id", params.sourceId)
    .eq("house_id", ctx.house.id)
    .maybeSingle();

  if (sourceError) return err(sourceError.message, "INTERNAL");
  if (!sourceFaq) return err("FAQ для дублювання не знайдено.", "NOT_FOUND");

  const { data: sourceItems, error: itemsError } = await ctx.supabase
    .from("house_faq_items")
    .select("question, answer, sort_order")
    .eq("faq_id", params.sourceId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    return err(`Не вдалося прочитати питання FAQ: ${itemsError.message}`, "INTERNAL");
  }

  const items = (sourceItems ?? [])
    .map((item) => ({
      question: typeof item.question === "string" ? item.question.trim() : "",
      answer: typeof item.answer === "string" ? item.answer.trim() : "",
    }))
    .filter((item) => item.question && item.answer);

  if (!items.length) {
    return err("У FAQ немає питань для дублювання.", "VALIDATION_FAILED");
  }

  const created: DuplicateTargetResult[] = [];

  for (const targetHouse of targetHousesResult.data) {
    const now = new Date().toISOString();

    const { data: targetFaq, error: targetFaqError } = await ctx.supabase
      .from("house_faq")
      .select("*")
      .eq("house_id", targetHouse.id)
      .maybeSingle();

    if (targetFaqError) {
      return err(targetFaqError.message, "INTERNAL");
    }

    let faq = targetFaq as Record<string, unknown> | null;

    if (!faq) {
      const { data: createdFaq, error: createError } = await ctx.supabase
        .from("house_faq")
        .insert({
          house_id: targetHouse.id,
          lifecycle_status: "draft",
          lock_version: 1,
          created_at: now,
          updated_at: now,
          published_at: null,
          archived_at: null,
        })
        .select("*")
        .single();

      if (createError || !createdFaq) {
        return err(
          `Не вдалося створити FAQ у будинку «${targetHouse.name}»: ${
            createError?.message ?? "невідома помилка"
          }`,
          "INTERNAL",
        );
      }

      faq = createdFaq as Record<string, unknown>;
    }

    const lockVersion = typeof faq.lock_version === "number" ? faq.lock_version : 1;

    const { data: replacedFaq, error: replaceError } = await ctx.supabase.rpc(
      "replace_house_faq_items",
      {
        p_house_id: targetHouse.id,
        p_lock_version: lockVersion,
        p_items: items,
      },
    );

    if (replaceError) {
      return err(
        `Не вдалося перенести FAQ у будинок «${targetHouse.name}»: ${replaceError.message}`,
        "INTERNAL",
      );
    }

    const createdId = String((replacedFaq as Record<string, unknown>)?.id ?? faq.id);

    created.push({
      targetHouseId: targetHouse.id,
      targetHouseName: targetHouse.name,
      createdId,
    });

    await writeHistory(ctx.supabase, {
      actor: ctx.user,
      houseId: targetHouse.id,
      entry: {
        entityType: "house_faq",
        entityId: createdId,
        action: "duplicated_created",
        description: `Створено чернетку FAQ з будинку «${ctx.house.name}».`,
        beforeSnapshot: faq,
        afterSnapshot: {
          faq: replacedFaq,
          items,
        },
        metadata: {
          subSectionKey: "faq",
          sourceHouseId: ctx.house.id,
          sourceEntityId: params.sourceId,
          itemsCount: items.length,
        },
      },
    });

    await safeRevalidate([`/house/${targetHouse.slug}/information`]);
  }

  return ok({
    source: sourceFaq as Record<string, unknown>,
    created,
  });
}
