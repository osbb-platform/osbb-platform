import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  assertChairmanContextMock,
  createSupabaseServerClientMock,
  createSupabaseAdminClientMock,
  adminRpcMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  assertChairmanContextMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
  adminRpcMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock(
  "@/src/modules/houses/chairman/guard",
  () => ({
    assertChairmanContext: assertChairmanContextMock,
    CHAIRMAN_ACTOR_NAME: "Голова ОСББ",
    CHAIRMAN_ACTOR_ROLE: "chairman",
    CHAIRMAN_SOURCE: "chairman_cabinet",
  }),
);

vi.mock(
  "@/src/integrations/supabase/server/server",
  () => ({
    createSupabaseServerClient: createSupabaseServerClientMock,
  }),
);

vi.mock(
  "../../src/integrations/supabase/server/admin",
  () => ({
    createSupabaseAdminClient: createSupabaseAdminClientMock,
  }),
);

import { createChairmanAnnouncement } from "../../src/modules/houses/chairman/createChairmanAnnouncement";

function makeSupabase() {
  const announcementSingle = vi.fn().mockResolvedValue({
    data: {
      id: "announcement-id",
      house_id: "house-id",
      title: "Новина",
      body: "Текст",
      level: "info",
      lifecycle_status: "published",
      published_at: "2026-08-24T00:00:00.000Z",
    },
    error: null,
  });

  const announcementSelect = vi.fn(() => ({
    single: announcementSingle,
  }));

  const announcementInsert = vi.fn(
    (payload: Record<string, unknown>) => {
      void payload;
      return {
        select: announcementSelect,
      };
    },
  );

  const historyInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "house_announcements") {
      return { insert: announcementInsert };
    }
    if (table === "house_content_history") {
      return { insert: historyInsert };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    client: { from },
    announcementInsert,
    historyInsert,
  };
}

describe("P08 createChairmanAnnouncement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminRpcMock.mockResolvedValue({ data: "task-id", error: null });
    createSupabaseAdminClientMock.mockReturnValue({ rpc: adminRpcMock });
  });

  it("publishes immediately for the guarded house and logs honest actor", async () => {
    const db = makeSupabase();
    createSupabaseServerClientMock.mockResolvedValue(db.client);

    assertChairmanContextMock.mockImplementation(
      async (
        params: unknown,
        operation: (context: {
          houseId: string;
          slug: string;
          sessionToken: string;
        }) => Promise<unknown>,
      ) => {
        expect(params).toEqual({ slug: "sobornyi-186" });
        return operation({
          houseId: "house-id",
          slug: "sobornyi-186",
          sessionToken: "session",
        });
      },
    );

    const result = await createChairmanAnnouncement({
      slug: "sobornyi-186",
      title: "  Новина  ",
      body: "  Текст  ",
      level: "info",
    });

    expect(result).toEqual({
      ok: true,
      announcementId: "announcement-id",
    });

    expect(db.announcementInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        house_id: "house-id",
        title: "Новина",
        body: "Текст",
        level: "info",
        lifecycle_status: "published",
        created_by: null,
      }),
    );

    expect(db.historyInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        house_id: "house-id",
        entity_type: "house_announcement",
        entity_id: "announcement-id",
        actor_admin_id: null,
        actor_name: "Голова ОСББ",
        actor_role: "chairman",
        metadata: expect.objectContaining({
          source: "chairman_cabinet",
          slug: "sobornyi-186",
        }),
      }),
    );

    expect(createSupabaseAdminClientMock).toHaveBeenCalledTimes(1);
    expect(adminRpcMock).toHaveBeenCalledWith(
      "create_house_scoped_platform_task",
      expect.objectContaining({
        p_house_id: "house-id",
        p_task_type: "system",
        p_title: "Перевірити оголошення голови",
        p_priority: "medium",
        p_link_type: "system_event",
        p_entity_type: "house_announcement",
        p_entity_id: "announcement-id",
        p_created_by: null,
        p_is_manual: false,
      }),
    );

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/house/sobornyi-186/announcements",
    );
  });

  it("cannot be expanded by lifecycle, foreign houseId or PDF fields", async () => {
    const db = makeSupabase();
    createSupabaseServerClientMock.mockResolvedValue(db.client);

    assertChairmanContextMock.mockImplementation(
      async (_params: unknown, operation: (context: {
        houseId: string;
        slug: string;
        sessionToken: string;
      }) => Promise<unknown>) =>
        operation({
          houseId: "guarded-house",
          slug: "house-a",
          sessionToken: "session",
        }),
    );

    const maliciousPayload = {
      slug: "house-a",
      title: "Новина",
      body: "Текст",
      level: "warning",
      houseId: "foreign-house",
      lifecycle_status: "draft",
      status: "archived",
      published_at: null,
      pdf: {
        bucket: "house-announcements",
        path: "evil.pdf",
      },
    } as never;

    const result = await createChairmanAnnouncement(maliciousPayload);

    expect(result.ok).toBe(true);
    expect(db.announcementInsert).toHaveBeenCalledTimes(1);

    const firstInsertCall = db.announcementInsert.mock.calls[0];
    expect(firstInsertCall).toBeDefined();
    const inserted = (firstInsertCall?.[0] ?? {}) as unknown as Record<
      string,
      unknown
    >;

    expect(inserted.house_id).toBe("guarded-house");
    expect(inserted.lifecycle_status).toBe("published");
    expect(inserted.created_by).toBeNull();
    expect(inserted).not.toHaveProperty("pdf");
    expect(inserted).not.toHaveProperty("status");
  });

  it("rejects invalid fields before touching the guard or database", async () => {
    const result = await createChairmanAnnouncement({
      slug: "house-a",
      title: "",
      body: "body",
      level: "info",
    });

    expect(result).toEqual({
      ok: false,
      error: "Вкажіть заголовок оголошення.",
    });
    expect(assertChairmanContextMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns a safe Ukrainian error when chairman guard rejects the request", async () => {
    assertChairmanContextMock.mockRejectedValue(new Error("FORBIDDEN"));

    const result = await createChairmanAnnouncement({
      slug: "house-a",
      title: "Новина",
      body: "Текст",
      level: "info",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Перевірте доступ");
    }
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
