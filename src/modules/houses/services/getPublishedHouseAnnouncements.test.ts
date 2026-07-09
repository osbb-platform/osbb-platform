import { beforeEach, describe, expect, it, vi } from "vitest";

const publicClientMocks = vi.hoisted(() => ({
  createSupabasePublicClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
}));

vi.mock("react", () => ({
  cache: <T>(fn: T) => fn,
}));

vi.mock("@/src/integrations/supabase/server/public", () => ({
  createSupabasePublicClient: publicClientMocks.createSupabasePublicClient,
}));

import { getPublishedHouseAnnouncements } from "./getPublishedHouseAnnouncements";

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "danger";
  published_at: string | null;
  updated_at: string;
};

type FileRow = {
  entity_id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
};

type FilterCall = {
  table: string;
  method: "eq" | "in";
  column: string;
  value: unknown;
};

class PublicQueryBuilder {
  constructor(
    private readonly table: string,
    private readonly announcements: AnnouncementRow[],
    private readonly files: FileRow[],
    private readonly filters: FilterCall[],
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ table: this.table, method: "eq", column, value });
    return this;
  }

  in(column: string, value: unknown) {
    this.filters.push({ table: this.table, method: "in", column, value });
    return this;
  }

  order() {
    return this;
  }

  then<TResult1 = { data: AnnouncementRow[] | FileRow[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: AnnouncementRow[] | FileRow[]; error: null },
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const data = this.table === "house_announcements" ? this.announcements : this.files;

    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }
}

function mockPublicClient(params: {
  announcements: AnnouncementRow[];
  files: FileRow[];
}) {
  const filters: FilterCall[] = [];

  publicClientMocks.createSupabasePublicClient.mockReturnValue({
    from(table: string) {
      return new PublicQueryBuilder(
        table,
        params.announcements,
        params.files,
        filters,
      );
    },
  });

  return { filters };
}

describe("getPublishedHouseAnnouncements PDF integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only published announcements and joins their pdf registry rows", async () => {
    const { filters } = mockPublicClient({
      announcements: [
        {
          id: "announcement-1",
          title: "With PDF",
          body: "Body",
          level: "info",
          published_at: "2026-07-09T00:00:00.000Z",
          updated_at: "2026-07-09T00:00:00.000Z",
        },
        {
          id: "announcement-2",
          title: "Without PDF",
          body: "Body",
          level: "warning",
          published_at: "2026-07-08T00:00:00.000Z",
          updated_at: "2026-07-08T00:00:00.000Z",
        },
      ],
      files: [
        {
          entity_id: "announcement-1",
          storage_bucket: "house-announcements",
          storage_path: "houses/house-1/announcements/announcement-1/notice.pdf",
          original_file_name: "notice.pdf",
          mime_type: "application/pdf",
          size_bytes: 1024,
          uploaded_at: "2026-07-09T00:00:00.000Z",
        },
      ],
    });

    const result = await getPublishedHouseAnnouncements("house-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "announcement-1",
      title: "With PDF",
      pdf: {
        bucket: "house-announcements",
        path: "houses/house-1/announcements/announcement-1/notice.pdf",
        originalName: "notice.pdf",
        mimeType: "application/pdf",
        size: 1024,
        uploadedAt: "2026-07-09T00:00:00.000Z",
      },
    });
    expect(result[1]).toMatchObject({
      id: "announcement-2",
      title: "Without PDF",
      pdf: null,
    });

    expect(filters).toContainEqual({
      table: "house_announcements",
      method: "eq",
      column: "house_id",
      value: "house-1",
    });
    expect(filters).toContainEqual({
      table: "house_announcements",
      method: "eq",
      column: "lifecycle_status",
      value: "published",
    });
    expect(filters).toContainEqual({
      table: "house_content_files",
      method: "eq",
      column: "entity_type",
      value: "house_announcement",
    });
    expect(filters).toContainEqual({
      table: "house_content_files",
      method: "eq",
      column: "field_key",
      value: "pdf",
    });
    expect(filters).toContainEqual({
      table: "house_content_files",
      method: "in",
      column: "entity_id",
      value: ["announcement-1", "announcement-2"],
    });
  });
});
