import { beforeEach, describe, expect, it, vi } from "vitest";

const publicClientFactory = vi.hoisted(() => vi.fn());
const serverClientFactory = vi.hoisted(() => vi.fn());

vi.mock("react", () => ({ cache: <T>(value: T) => value }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(value: T) => value,
  unstable_noStore: vi.fn(),
}));
vi.mock("@/src/integrations/supabase/server/public", () => ({
  createSupabasePublicClient: publicClientFactory,
}));
vi.mock("@/src/integrations/supabase/server/server", () => ({
  createSupabaseServerClient: serverClientFactory,
}));

function publicClient(result: { data: unknown; error: { message: string } | null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  };

  return {
    from: vi.fn(() => query),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.test/cover" } })),
      })),
    },
  };
}

function adminClient(options: {
  authUser?: { id: string; email?: string } | null;
  authError?: {
    message: string;
    name?: string;
    code?: string;
  } | null;
  profileError?: { message: string } | null;
  membershipError?: { message: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.authUser === undefined ? { id: "user-1" } : options.authUser },
        error: options.authError ?? null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          maybeSingle: vi.fn(async () => ({
            data: { id: "user-1", email: "admin@example.test", full_name: "Admin" },
            error: options.profileError ?? null,
          })),
        };
        return query;
      }

      const result = {
        data: [],
        error: options.membershipError ?? null,
      };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        is: vi.fn(() => query),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    }),
  };
}

describe("production shared failure semantics", () => {
  beforeEach(() => {
    vi.resetModules();
    publicClientFactory.mockReset();
    serverClientFactory.mockReset();
  });

  it("keeps a proven missing public house as null", async () => {
    publicClientFactory.mockReturnValue(publicClient({ data: null, error: null }));
    const { getHouseBySlug } = await import("@/src/modules/houses/services/getHouseBySlug");

    await expect(getHouseBySlug("missing-house")).resolves.toBeNull();
  });

  it("throws a retryable route error for a public house infrastructure failure", async () => {
    publicClientFactory.mockReturnValue(
      publicClient({ data: null, error: { message: "temporary backend failure" } }),
    );
    const { getHouseBySlug } = await import("@/src/modules/houses/services/getHouseBySlug");

    await expect(getHouseBySlug("existing-house")).rejects.toThrow(
      "Failed to load public house",
    );
  });

  it("returns null only when the authenticated user is genuinely absent", async () => {
    serverClientFactory.mockResolvedValue(adminClient({ authUser: null }));
    const { getCurrentAdminUser } = await import("@/src/modules/auth/services/getCurrentAdminUser");

    await expect(getCurrentAdminUser()).resolves.toBeNull();
  });

  it("treats a missing Supabase auth session as unauthenticated instead of infrastructure failure", async () => {
    serverClientFactory.mockResolvedValue(
      adminClient({
        authUser: null,
        authError: {
          name: "AuthSessionMissingError",
          message: "Auth session missing!",
        },
      }),
    );

    const { getCurrentAdminUser } = await import(
      "@/src/modules/auth/services/getCurrentAdminUser"
    );

    await expect(getCurrentAdminUser()).resolves.toBeNull();
  });

  it.each([
    ["auth", { authError: { message: "auth backend unavailable" } }],
    ["profile", { profileError: { message: "profile backend unavailable" } }],
    ["membership", { membershipError: { message: "membership backend unavailable" } }],
  ])("throws on %s infrastructure failure", async (_label, options) => {
    serverClientFactory.mockResolvedValue(adminClient(options));
    const { getCurrentAdminUser } = await import("@/src/modules/auth/services/getCurrentAdminUser");

    await expect(getCurrentAdminUser()).rejects.toThrow(
      "Failed to resolve current admin user",
    );
  });

  it("does not collapse an unexpected backend exception into no session", async () => {
    serverClientFactory.mockRejectedValue(new Error("backend exception"));
    const { getCurrentAdminUser } = await import("@/src/modules/auth/services/getCurrentAdminUser");

    await expect(getCurrentAdminUser()).rejects.toThrow(
      "Failed to resolve current admin user",
    );
  });
});
