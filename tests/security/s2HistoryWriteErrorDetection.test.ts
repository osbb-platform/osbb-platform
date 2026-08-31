import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { writeHistory } from "../../src/modules/content-engine/v2/services/historyService";

describe("S2-T2 history write error handling", () => {
  it("RED: detects a Supabase insert { error } without throwing after domain commit", async () => {
    const insertError = {
      code: "42501",
      message: "permission denied for table house_content_history",
      details: null,
      hint: null,
    };

    const insert = vi.fn(async () => ({
      data: null,
      error: insertError,
    }));

    const from = vi.fn(() => ({
      insert,
    }));

    const supabase = { from } as unknown as SupabaseClient;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      writeHistory(supabase, {
        actor: {
          id: "11111111-1111-4111-8111-111111111111",
          fullName: "S2 T2",
          email: "s2-t2@example.test",
          role: "admin",
        },
        houseId: "22222222-2222-4222-8222-222222222222",
        entry: {
          entityType: "house_report",
          entityId: "33333333-3333-4333-8333-333333333333",
          action: "update",
          description: "S2-T2 acceptance",
        },
      }),
    ).resolves.toBeUndefined();

    expect(from).toHaveBeenCalledWith("house_content_history");
    expect(insert).toHaveBeenCalledTimes(1);

    // This is the fail-before-fix assertion:
    // a returned Supabase { error } must become observable.
    expect(consoleError).toHaveBeenCalledWith(
      "writeHistory failed (non-blocking):",
      expect.objectContaining({
        code: "42501",
      }),
    );

    consoleError.mockRestore();
  });

  it("keeps thrown history failures non-fatal and observable", async () => {
    const thrown = new Error("network failure");

    const insert = vi.fn(async () => {
      throw thrown;
    });

    const from = vi.fn(() => ({
      insert,
    }));

    const supabase = { from } as unknown as SupabaseClient;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      writeHistory(supabase, {
        actor: {
          id: "11111111-1111-4111-8111-111111111111",
          fullName: "S2 T2",
          email: "s2-t2@example.test",
          role: "admin",
        },
        houseId: "22222222-2222-4222-8222-222222222222",
        entry: {
          entityType: "house_report",
          entityId: "33333333-3333-4333-8333-333333333333",
          action: "update",
          description: "S2-T2 thrown failure",
        },
      }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "writeHistory failed (non-blocking):",
      thrown,
    );

    consoleError.mockRestore();
  });
});
