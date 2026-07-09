import { describe, expect, it } from "vitest";

import { createCommand } from "./create";
import { deleteAllArchivedCommand } from "./deleteAllArchived";
import { deleteCommand } from "./delete";
import { removePdfCommand } from "./removePdf";
import { replacePdfCommand } from "./replacePdf";
import { updateCommand } from "./update";
import type { Announcement, HouseAnnouncementFileInput } from "../types";

const HOUSE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HOUSE_SLUG = "test-house";
const ACTOR_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ANNOUNCEMENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ANNOUNCEMENT_ID = "22222222-2222-4222-8222-222222222222";

type DbError = { message: string };
type QueryResult<T> = { data: T | null; error: DbError | null };

type FakeConfig = {
  selectSingle?: unknown;
  insertData?: unknown;
  updateData?: unknown;
  deleteData?: unknown;
  archivedRows?: unknown[];
};

type FakeCalls = {
  insertPayloads: unknown[];
  updatePayloads: unknown[];
  deleteCount: number;
  filters: Array<{ table: string; column: string; value: unknown }>;
};

class FakeQueryBuilder {
  private operation: "select" | "insert" | "update" | "delete" | null = null;
  private payload: unknown = null;

  constructor(
    private readonly table: string,
    private readonly config: FakeConfig,
    private readonly calls: FakeCalls,
  ) {}

  select() {
    if (!this.operation) {
      this.operation = "select";
    }
    return this;
  }

  insert(payload: unknown) {
    this.operation = "insert";
    this.payload = payload;
    this.calls.insertPayloads.push(payload);
    return this;
  }

  update(payload: unknown) {
    this.operation = "update";
    this.payload = payload;
    this.calls.updatePayloads.push(payload);
    return this;
  }

  delete() {
    this.operation = "delete";
    this.calls.deleteCount += 1;
    return this;
  }

  eq(column: string, value: unknown) {
    this.calls.filters.push({ table: this.table, column, value });
    return this;
  }

  in(column: string, value: unknown) {
    this.calls.filters.push({ table: this.table, column, value });
    return this;
  }

  order() {
    return this;
  }

  async maybeSingle(): Promise<QueryResult<unknown>> {
    if (this.operation === "insert") {
      return {
        data: this.config.insertData ?? this.payload,
        error: null,
      };
    }

    if (this.operation === "update") {
      return {
        data: this.config.updateData ?? this.config.selectSingle ?? this.payload,
        error: null,
      };
    }

    if (this.operation === "delete") {
      return {
        data: this.config.deleteData ?? this.config.selectSingle ?? null,
        error: null,
      };
    }

    return {
      data: this.config.selectSingle ?? null,
      error: null,
    };
  }

  then<TResult1 = QueryResult<unknown[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<unknown[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const result: QueryResult<unknown[]> = {
      data: this.operation === "select" ? (this.config.archivedRows ?? []) : null,
      error: null,
    };

    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function createSupabase(config: FakeConfig = {}) {
  const calls: FakeCalls = {
    insertPayloads: [],
    updatePayloads: [],
    deleteCount: 0,
    filters: [],
  };

  return {
    calls,
    supabase: {
      from(table: string) {
        return new FakeQueryBuilder(table, config, calls);
      },
    },
  };
}

function createCtx(config: FakeConfig = {}) {
  const { supabase, calls } = createSupabase(config);

  return {
    calls,
    ctx: {
      supabase,
      user: {
        id: ACTOR_ID,
        email: "admin@example.com",
        fullName: "Admin",
        role: "admin",
      },
      house: {
        id: HOUSE_ID,
        slug: HOUSE_SLUG,
        name: "Test House",
      },
      command: {
        type: "announcements.test",
        houseId: HOUSE_ID,
        payload: {},
      },
    } as never,
  };
}

function announcement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: ANNOUNCEMENT_ID,
    house_id: HOUSE_ID,
    title: "Announcement",
    body: "Body",
    level: "info",
    lifecycle_status: "draft",
    lock_version: 1,
    created_at: "2026-07-09T00:00:00.000Z",
    updated_at: "2026-07-09T00:00:00.000Z",
    published_at: null,
    archived_at: null,
    created_by: ACTOR_ID,
    ...overrides,
  };
}

function pdfInput(announcementId = ANNOUNCEMENT_ID): HouseAnnouncementFileInput {
  return {
    bucket: "house-announcements",
    path: `houses/${HOUSE_ID}/announcements/${announcementId}/notice.pdf`,
    originalName: "notice.pdf",
    mimeType: "application/pdf",
    size: 1024,
  };
}

function assertOk<T>(result: { ok: boolean; data?: T; error?: string }): T {
  if (!result.ok) {
    throw new Error(result.error ?? "Expected ok result");
  }

  return result.data as T;
}

describe("announcement PDF command integration contracts", () => {
  it("creates draft announcement with one tracked PDF when an explicit announcement id is provided", async () => {
    const created = announcement({ id: ANNOUNCEMENT_ID });
    const { ctx, calls } = createCtx({ insertData: created });

    const result = await createCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        title: "  Announcement with PDF  ",
        body: "  Body  ",
        level: "warning",
        pdf: pdfInput(),
      },
      ctx,
    );

    const data = assertOk(result);

    expect(calls.insertPayloads[0]).toMatchObject({
      id: ANNOUNCEMENT_ID,
      house_id: HOUSE_ID,
      title: "Announcement with PDF",
      body: "Body",
      level: "warning",
      lifecycle_status: "draft",
      published_at: null,
      archived_at: null,
      created_by: ACTOR_ID,
    });

    expect(data.filesToTrack).toEqual([
      {
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: `houses/${HOUSE_ID}/announcements/${ANNOUNCEMENT_ID}/notice.pdf`,
        originalName: "notice.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    ]);

    expect(data.filesToDelete).toBeUndefined();
    expect(data.extraRevalidatePaths).toEqual([
      `/house/${HOUSE_SLUG}`,
      `/house/${HOUSE_SLUG}/announcements`,
    ]);
  });

  it("keeps no-PDF create regression path free from file tracking", async () => {
    const created = announcement({ id: OTHER_ANNOUNCEMENT_ID });
    const { ctx } = createCtx({ insertData: created });

    const result = await createCommand.execute(
      {
        title: "No PDF announcement",
        body: "Body",
        level: "info",
      },
      ctx,
    );

    const data = assertOk(result);

    expect(data.filesToTrack).toBeUndefined();
    expect(data.filesToDelete).toBeUndefined();
    expect(data.history.entityType).toBe("house_announcement");
  });

  it("updates and replaces PDF by deleting the old tracked file and tracking the new one", async () => {
    const before = announcement({ title: "Before", lock_version: 4 });
    const after = announcement({ title: "After", lock_version: 5 });
    const { ctx, calls } = createCtx({ selectSingle: before, updateData: after });

    const result = await updateCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        lockVersion: 4,
        title: "After",
        body: "Updated body",
        level: "danger",
        pdf: pdfInput(),
      },
      ctx,
    );

    const data = assertOk(result);

    expect(calls.updatePayloads[0]).toMatchObject({
      title: "After",
      body: "Updated body",
      level: "danger",
      lock_version: 5,
    });

    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
        fieldKeys: ["pdf"],
      },
    ]);
    expect(data.filesToTrack).toEqual([
      {
        fieldKey: "pdf",
        bucket: "house-announcements",
        path: `houses/${HOUSE_ID}/announcements/${ANNOUNCEMENT_ID}/notice.pdf`,
        originalName: "notice.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    ]);
  });

  it("updates and removes PDF without tracking a replacement", async () => {
    const before = announcement({ lock_version: 2 });
    const after = announcement({ lock_version: 3 });
    const { ctx } = createCtx({ selectSingle: before, updateData: after });

    const result = await updateCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        lockVersion: 2,
        title: "Remove PDF",
        body: "Body",
        level: "info",
        removePdf: true,
      },
      ctx,
    );

    const data = assertOk(result);

    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
        fieldKeys: ["pdf"],
      },
    ]);
    expect(data.filesToTrack).toBeUndefined();
  });

  it("replacePdf command only touches PDF tracking and increments lock version", async () => {
    const before = announcement({ lock_version: 6 });
    const after = announcement({ lock_version: 7 });
    const { ctx, calls } = createCtx({ selectSingle: before, updateData: after });

    const result = await replacePdfCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        lockVersion: 6,
        pdf: pdfInput(),
      },
      ctx,
    );

    const data = assertOk(result);

    expect(calls.updatePayloads[0]).toMatchObject({
      lock_version: 7,
    });
    expect(data.history.action).toBe("pdf_replaced");
    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
        fieldKeys: ["pdf"],
      },
    ]);
    expect(data.filesToTrack).toHaveLength(1);
  });

  it("removePdf command deletes only the PDF field ref", async () => {
    const before = announcement({ lock_version: 8 });
    const after = announcement({ lock_version: 9 });
    const { ctx } = createCtx({ selectSingle: before, updateData: after });

    const result = await removePdfCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        lockVersion: 8,
      },
      ctx,
    );

    const data = assertOk(result);

    expect(data.history.action).toBe("pdf_removed");
    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
        fieldKeys: ["pdf"],
      },
    ]);
    expect(data.filesToTrack).toBeUndefined();
  });

  it("delete command cleans every tracked file for the announcement entity", async () => {
    const before = announcement({ lock_version: 10 });
    const { ctx } = createCtx({ selectSingle: before, deleteData: before });

    const result = await deleteCommand.execute(
      {
        id: ANNOUNCEMENT_ID,
        lockVersion: 10,
      },
      ctx,
    );

    const data = assertOk(result);

    expect(data.history.action).toBe("deleted");
    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
      },
    ]);
  });

  it("deleteAllArchived cleans files for every archived announcement", async () => {
    const archivedOne = announcement({
      id: ANNOUNCEMENT_ID,
      lifecycle_status: "archived",
    });
    const archivedTwo = announcement({
      id: OTHER_ANNOUNCEMENT_ID,
      lifecycle_status: "archived",
    });
    const { ctx } = createCtx({ archivedRows: [archivedOne, archivedTwo] });

    const result = await deleteAllArchivedCommand.execute({}, ctx);
    const data = assertOk(result);

    expect(data.data).toEqual({ deletedCount: 2 });
    expect(data.filesToDelete).toEqual([
      {
        entityType: "house_announcement",
        entityId: ANNOUNCEMENT_ID,
      },
      {
        entityType: "house_announcement",
        entityId: OTHER_ANNOUNCEMENT_ID,
      },
    ]);
  });

  it("deleteAllArchived no-op path does not emit file cleanup refs", async () => {
    const { ctx } = createCtx({ archivedRows: [] });

    const result = await deleteAllArchivedCommand.execute({}, ctx);
    const data = assertOk(result);

    expect(data.data).toEqual({ deletedCount: 0 });
    expect(data.filesToDelete).toBeUndefined();
  });
});
