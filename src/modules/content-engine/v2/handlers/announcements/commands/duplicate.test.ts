import { beforeEach, describe, expect, it, vi } from "vitest";

const cloneMocks = vi.hoisted(() => ({
  duplicateTableRecordToDraft: vi.fn(),
  parseDuplicatePayload: vi.fn(),
  validateDuplicatePayload: vi.fn(),
}));

vi.mock("../../../services/cloneService", () => ({
  duplicateTableRecordToDraft: cloneMocks.duplicateTableRecordToDraft,
  parseDuplicatePayload: cloneMocks.parseDuplicatePayload,
  validateDuplicatePayload: cloneMocks.validateDuplicatePayload,
}));

import { duplicateCommand } from "./duplicate";

describe("announcement duplicate command", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    cloneMocks.parseDuplicatePayload.mockReturnValue({
      ok: true,
      data: {
        sourceId: "source-announcement-id",
        targetHouseIds: ["target-house-id"],
      },
    });

    cloneMocks.validateDuplicatePayload.mockReturnValue({
      ok: true,
      data: undefined,
    });

    cloneMocks.duplicateTableRecordToDraft.mockResolvedValue({
      ok: true,
      data: {
        source: {
          id: "source-announcement-id",
          house_id: "source-house-id",
          title: "PDF announcement",
          body: "Body",
          level: "info",
          lifecycle_status: "published",
          lock_version: 1,
          created_at: "2026-07-09T00:00:00.000Z",
          updated_at: "2026-07-09T00:00:00.000Z",
          published_at: "2026-07-09T00:00:00.000Z",
          archived_at: null,
          created_by: "actor-id",
        },
        created: [
          {
            targetHouseId: "target-house-id",
            targetHouseSlug: "target-house",
            createdId: "new-announcement-id",
          },
        ],
      },
    });
  });

  it("delegates duplication to cloneService with announcement entity type and target PDF path builder", async () => {
    const result = await duplicateCommand.execute(
      {
        sourceId: "source-announcement-id",
        targetHouseIds: ["target-house-id"],
      },
      {
        supabase: {},
        user: {
          id: "actor-id",
          email: "admin@example.com",
          fullName: "Admin",
          role: "admin",
        },
        house: {
          id: "source-house-id",
          slug: "source-house",
          name: "Source House",
        },
        command: {
          type: "announcements.duplicate",
          houseId: "source-house-id",
          payload: {},
        },
      } as never,
    );

    expect(result.ok).toBe(true);
    expect(cloneMocks.duplicateTableRecordToDraft).toHaveBeenCalledTimes(1);

    const params = cloneMocks.duplicateTableRecordToDraft.mock.calls[0]?.[0];

    expect(params).toMatchObject({
      sourceTable: "house_announcements",
      entityType: "house_announcement",
      sourceId: "source-announcement-id",
      targetHouseIds: ["target-house-id"],
      historyMetadata: { subSectionKey: "announcements" },
    });

    expect(params.publicPathsForHouse("target-house")).toEqual([
      "/house/target-house",
      "/house/target-house/announcements",
    ]);

    expect(typeof params.buildTargetFilePath).toBe("function");
    expect(
      params.buildTargetFilePath({
        sourcePath:
          "houses/source-house-id/announcements/source-announcement-id/source.pdf",
        targetHouse: {
          id: "target-house-id",
          slug: "target-house",
          name: "Target House",
        },
        targetEntityId: "new-announcement-id",
        fieldKey: "pdf",
        bucket: "house-announcements",
        originalName: "source.pdf",
        mimeType: "application/pdf",
        size: 1024,
      }),
    ).toMatch(
      /^houses\/target-house-id\/announcements\/new-announcement-id\/pdf-\d+-[0-9a-f-]+\.pdf$/i,
    );

    const insert = params.buildInsert({
      source: {
        id: "source-announcement-id",
        title: "PDF announcement",
        body: "Body",
        level: "warning",
      },
      targetHouse: {
        id: "target-house-id",
        slug: "target-house",
        name: "Target House",
      },
      newId: "new-announcement-id",
      actor: { id: "actor-id" },
      now: "2026-07-09T00:00:00.000Z",
      copiedFiles: [
        {
          fieldKey: "pdf",
          bucket: "house-announcements",
          path: "houses/target-house-id/announcements/new-announcement-id/pdf-copy.pdf",
          originalName: "source.pdf",
          mimeType: "application/pdf",
          size: 1024,
        },
      ],
    });

    expect(insert).toMatchObject({
      id: "new-announcement-id",
      house_id: "target-house-id",
      title: "PDF announcement",
      body: "Body",
      level: "warning",
      lifecycle_status: "draft",
      published_at: null,
      archived_at: null,
      created_by: "actor-id",
    });
  });
});
