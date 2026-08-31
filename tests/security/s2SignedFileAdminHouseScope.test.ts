import { beforeEach, describe, expect, it, vi } from "vitest";

const HOUSE_A = "11111111-1111-4111-8111-111111111111";
const HOUSE_B = "22222222-2222-4222-8222-222222222222";
const REPORT_B = "33333333-3333-4333-8333-333333333333";
const USER_A = "44444444-4444-4444-8444-444444444444";

const state = vi.hoisted(() => ({
  rpcCalls: [] as Array<{ fn: string; args?: Record<string, unknown> }>,
  signedCalls: [] as Array<{ bucket: string; path: string }>,
}));

function createServerClientMock() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: USER_A } },
        error: null,
      })),
    },
    rpc: vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      state.rpcCalls.push({ fn, args });

      if (fn === "get_my_admin_role") {
        return { data: "admin", error: null };
      }

      if (fn === "admin_has_house_access") {
        const target = args?.target_house_id;
        return { data: target === HOUSE_A, error: null };
      }

      return { data: null, error: null };
    }),
  };
}

function queryFor(table: string) {
  const filters = new Map<string, unknown>();

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.set(column, value);
      return query;
    }),
    maybeSingle: vi.fn(async () => {
      if (table === "house_content_files") {
        if (
          filters.get("entity_type") === "house_report" &&
          filters.get("entity_id") === REPORT_B
        ) {
          return {
            data: {
              entity_type: "house_report",
              entity_id: REPORT_B,
              field_key: "pdf",
              storage_bucket: "house-reports",
              storage_path: `houses/${HOUSE_B}/reports/${REPORT_B}/report.pdf`,
              original_file_name: "report.pdf",
              mime_type: "application/pdf",
              size_bytes: 1024,
            },
            error: null,
          };
        }

        return { data: null, error: null };
      }

      if (table === "house_reports") {
        return {
          data: {
            id: REPORT_B,
            house_id: HOUSE_B,
            lifecycle_status: "draft",
          },
          error: null,
        };
      }

      return { data: null, error: null };
    }),
  };

  return query;
}

function createAdminClientMock() {
  return {
    from: vi.fn((table: string) => queryFor(table)),
    storage: {
      from: vi.fn((bucket: string) => ({
        createSignedUrl: vi.fn(async (path: string) => {
          state.signedCalls.push({ bucket, path });
          return {
            data: { signedUrl: `https://signed.local/${bucket}/${path}` },
            error: null,
          };
        }),
      })),
    },
  };
}

vi.mock(
  "../../src/integrations/supabase/server/server",
  () => ({
    createSupabaseServerClient: vi.fn(async () => createServerClientMock()),
  }),
);

vi.mock(
  "../../src/integrations/supabase/server/admin",
  () => ({
    createSupabaseAdminClient: vi.fn(() => createAdminClientMock()),
  }),
);

import { resolveSignedFileUrl } from "../../src/modules/files/services/resolveSignedFileUrl";

describe("S2-T1 signed-file admin house scope", () => {
  beforeEach(() => {
    state.rpcCalls.length = 0;
    state.signedCalls.length = 0;
  });

  it("RED: city/house-scoped admin cannot sign a known draft entity from a foreign house", async () => {
    const result = await resolveSignedFileUrl({
      entityType: "house_report",
      entityId: REPORT_B,
      fieldKey: "pdf",
    });

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
    });

    expect(state.rpcCalls).toContainEqual({
      fn: "admin_has_house_access",
      args: { target_house_id: HOUSE_B },
    });

    expect(state.signedCalls).toHaveLength(0);
  });

  it("RED: generated legacy announcement PDF requires exact house access before signing", async () => {
    const result = await resolveSignedFileUrl({
      bucket: "house-announcements",
      path: `${HOUSE_B}/announcement.pdf`,
    });

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
    });

    expect(state.rpcCalls).toContainEqual({
      fn: "admin_has_house_access",
      args: { target_house_id: HOUSE_B },
    });

    expect(state.signedCalls).toHaveLength(0);
  });
});
