import { describe, expect, it } from "vitest";

import { createPublishableSupabaseTestClient } from "@/tests/helpers/createPublishableSupabaseTestClient";
import { invokeServerAction } from "@/tests/helpers/invokeServerAction";

describe("S1.T0 test-runner smoke", () => {
  it("invokes an async server-action-shaped function", async () => {
    const action = async (value: number) => ({
      ok: true as const,
      data: value + 1,
    });

    await expect(invokeServerAction(action, 41)).resolves.toEqual({
      ok: true,
      data: 42,
    });
  });

  it("creates a publishable Supabase client without a network request", () => {
    let requestCount = 0;

    const noNetworkFetch: typeof globalThis.fetch = async () => {
      requestCount += 1;
      throw new Error("Network access is forbidden in the S1.T0 smoke test");
    };

    const client = createPublishableSupabaseTestClient({
      supabaseUrl: "https://example.supabase.co",
      publishableKey: "test-publishable-key",
      fetch: noNetworkFetch,
    });

    expect(client).toBeDefined();
    expect(requestCount).toBe(0);
  });

  it("rejects service-role-like credentials", () => {
    expect(() =>
      createPublishableSupabaseTestClient({
        supabaseUrl: "https://example.supabase.co",
        publishableKey: "sb_secret_test-only",
      }),
    ).toThrow(/publishable or anon key/i);
  });
});
