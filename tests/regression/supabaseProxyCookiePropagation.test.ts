import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

describe("Supabase auth refresh through the admin rewrite", () => {
  beforeEach(() => {
    vi.resetModules();
    createServerClientMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "example.test";
  });

  it("preserves refreshed request cookies, response cookies, and anti-cache headers", async () => {
    createServerClientMock.mockImplementation(
      (_url: string, _key: string, options: {
        cookies: {
          setAll: (
            cookies: Array<{ name: string; value: string; options: { path: string } }>,
            headers: Record<string, string>,
          ) => void;
        };
      }) => ({
        auth: {
          getUser: async () => {
            options.cookies.setAll(
              [{ name: "sb-test-auth-token", value: "refreshed-test-value", options: { path: "/" } }],
              {
                "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
                Expires: "0",
                Pragma: "no-cache",
              },
            );
            return { data: { user: { id: "user-1" } }, error: null };
          },
        },
      }),
    );

    const { proxy } = await import("../../proxy");
    const request = new NextRequest("https://admin.example.test/houses", {
      headers: {
        host: "admin.example.test",
        cookie: "sb-test-auth-token=old-test-value",
      },
    });

    const response = await proxy(request);

    expect(response.headers.get("set-cookie")).toContain("refreshed-test-value");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "refreshed-test-value",
    );
    expect(response.headers.get("x-middleware-rewrite")).toContain("/admin/houses");
  });
});
