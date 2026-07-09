import { describe, expect, it, vi } from "vitest";

import { cleanupFiles, trackFiles } from "./fileService";

type FileRow = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  field_key: string;
};

type Calls = {
  insertedRows: unknown[];
  selectFilters: Array<{ column: string; value: unknown }>;
  inFilters: Array<{ column: string; value: unknown }>;
  removed: Array<{ bucket: string; paths: string[] }>;
  deletedIds: string[];
};

function createFileSupabase(files: FileRow[]) {
  const calls: Calls = {
    insertedRows: [],
    selectFilters: [],
    inFilters: [],
    removed: [],
    deletedIds: [],
  };

  const selectBuilder = {
    select() {
      return this;
    },
    eq(column: string, value: unknown) {
      calls.selectFilters.push({ column, value });
      return this;
    },
    in(column: string, value: unknown) {
      calls.inFilters.push({ column, value });
      return this;
    },
    then<TResult1 = { data: FileRow[]; error: null }, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: FileRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve({ data: files, error: null }).then(onfulfilled, onrejected);
    },
  };

  const deleteBuilder = {
    in(column: string, ids: string[]) {
      calls.deletedIds = ids;
      calls.inFilters.push({ column, value: ids });
      return Promise.resolve({ error: null });
    },
  };

  const supabase = {
    from: vi.fn(() => ({
      insert(rows: unknown[]) {
        calls.insertedRows = rows;
        return Promise.resolve({ error: null });
      },
      select() {
        return selectBuilder;
      },
      delete() {
        return deleteBuilder;
      },
    })),
    storage: {
      from: vi.fn((bucket: string) => ({
        remove(paths: string[]) {
          calls.removed.push({ bucket, paths });
          return Promise.resolve({ error: null });
        },
      })),
    },
  };

  return { supabase, calls };
}

describe("fileService announcement PDF tracking integration", () => {
  it("tracks an announcement PDF in house_content_files with the correct entity and field", async () => {
    const { supabase, calls } = createFileSupabase([]);

    const result = await trackFiles(supabase as never, {
      entityType: "house_announcement",
      entityId: "announcement-1",
      files: [
        {
          fieldKey: "pdf",
          bucket: "house-announcements",
          path: "houses/house-1/announcements/announcement-1/notice.pdf",
          originalName: "notice.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(calls.insertedRows).toEqual([
      {
        entity_type: "house_announcement",
        entity_id: "announcement-1",
        field_key: "pdf",
        storage_bucket: "house-announcements",
        storage_path: "houses/house-1/announcements/announcement-1/notice.pdf",
        original_file_name: "notice.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
      },
    ]);
  });

  it("cleanupFiles removes announcement PDF from storage and then deletes registry rows", async () => {
    const { supabase, calls } = createFileSupabase([
      {
        id: "file-1",
        storage_bucket: "house-announcements",
        storage_path: "houses/house-1/announcements/announcement-1/old.pdf",
        field_key: "pdf",
      },
    ]);

    const result = await cleanupFiles(supabase as never, [
      {
        entityType: "house_announcement",
        entityId: "announcement-1",
        fieldKeys: ["pdf"],
      },
    ]);

    expect(result.ok).toBe(true);
    expect(calls.selectFilters).toEqual([
      { column: "entity_type", value: "house_announcement" },
      { column: "entity_id", value: "announcement-1" },
    ]);
    expect(calls.inFilters).toContainEqual({ column: "field_key", value: ["pdf"] });
    expect(calls.removed).toEqual([
      {
        bucket: "house-announcements",
        paths: ["houses/house-1/announcements/announcement-1/old.pdf"],
      },
    ]);
    expect(calls.deletedIds).toEqual(["file-1"]);
  });
});
