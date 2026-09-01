import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  writeHistory,
  type HistoryWriteFailure,
} from "../../src/modules/content-engine/v2/services/historyService";

const params = {
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
    description: "S2-T2 strict acceptance",
    metadata: {
      source: "s2-t2-test",
    },
  },
};

describe("S2-T2 strict history write handling", () => {
  it("RED: returned Supabase error becomes typed non-fatal warning + reconciliation record", async () => {
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

    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await writeHistory(supabase, params);

    expect(result.ok).toBe(false);

    const failure = result as HistoryWriteFailure;

    expect(failure.warning).toEqual({
      code: "HISTORY_WRITE_FAILED",
      severity: "warning",
      nonFatal: true,
      houseId: params.houseId,
      entityType: params.entry.entityType,
      entityId: params.entry.entityId,
      action: params.entry.action,
      reconciliationKey: expect.stringMatching(/^history:/),
    });

    expect(failure.reconciliation).toEqual({
      version: 1,
      kind: "house_content_history",
      reconciliationKey: failure.warning.reconciliationKey,
      payload: expect.objectContaining({
        actor_admin_id: params.actor.id,
        house_id: params.houseId,
        entity_type: params.entry.entityType,
        entity_id: params.entry.entityId,
        action: params.entry.action,
        description: params.entry.description,
        metadata: params.entry.metadata,
      }),
    });

    expect(consoleError).toHaveBeenCalledWith(
      "writeHistory failed (non-blocking)",
      expect.objectContaining({
        warning: failure.warning,
        reconciliation: failure.reconciliation,
        error: insertError,
      }),
    );

    consoleError.mockRestore();
  });

  it("keeps thrown history failures non-fatal, typed and reconcilable", async () => {
    const thrown = new Error("network failure");

    const insert = vi.fn(async () => {
      throw thrown;
    });

    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await writeHistory(supabase, params);

    expect(result.ok).toBe(false);

    const failure = result as HistoryWriteFailure;
    expect(failure.warning.code).toBe("HISTORY_WRITE_FAILED");
    expect(failure.warning.nonFatal).toBe(true);
    expect(failure.reconciliation.payload.entity_id).toBe(params.entry.entityId);

    expect(consoleError).toHaveBeenCalledWith(
      "writeHistory failed (non-blocking)",
      expect.objectContaining({
        warning: failure.warning,
        reconciliation: failure.reconciliation,
        error: thrown,
      }),
    );

    consoleError.mockRestore();
  });

  it("returns an explicit success outcome when history insert succeeds", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: null,
    }));

    const from = vi.fn(() => ({ insert }));
    const supabase = { from } as unknown as SupabaseClient;

    await expect(writeHistory(supabase, params)).resolves.toEqual({
      ok: true,
    });
  });

  it("pipeline emits the typed warning without failing a committed command", () => {
    const pipeline = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/modules/content-engine/v2/pipeline.ts",
      ),
      "utf8",
    );

    expect(pipeline).toContain("const historyResult = await writeHistory");
    expect(pipeline).toContain("if (!historyResult.ok)");
    expect(pipeline).toContain(
      "Command pipeline non-fatal warning after domain mutation",
    );
    expect(pipeline).toContain("warning: historyResult.warning");
    expect(pipeline).toContain("return ok(undefined)");
  });

  it("ships a separate dry-run-first reconciliation operation", () => {
    const script = fs.readFileSync(
      path.join(
        process.cwd(),
        "scripts/reconcile-house-content-history.mjs",
      ),
      "utf8",
    );

    const docs = fs.readFileSync(
      path.join(
        process.cwd(),
        "docs/operations/history-reconciliation.md",
      ),
      "utf8",
    );

    expect(script).toContain('const apply = process.argv.includes("--apply")');
    expect(script).toContain("DRY_RUN");
    expect(script).toContain('from("house_content_history")');
    expect(script).toContain(".insert(payload)");
    expect(docs).toContain("dry-run");
    expect(docs).toContain("--apply");
    expect(docs).toContain("reconciliation");
  });
});

describe("S2 reconciliation key collision resistance", () => {
  it("keeps the same failed event deterministic", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: {
        code: "42501",
        message: "forced history failure",
      },
    }));

    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient;

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const first = await writeHistory(supabase, params);
    const second = await writeHistory(supabase, params);

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);

    if (!first.ok && !second.ok) {
      expect(first.warning.reconciliationKey)
        .toBe(second.warning.reconciliationKey);
    }

    consoleError.mockRestore();
  });

  it("does not collide for distinct updates of the same entity", async () => {
    const insert = vi.fn(async () => ({
      data: null,
      error: {
        code: "42501",
        message: "forced history failure",
      },
    }));

    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient;

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const first = await writeHistory(supabase, {
      ...params,
      entry: {
        ...params.entry,
        description: "First failed update",
        afterSnapshot: { title: "Version A" },
      },
    });

    const second = await writeHistory(supabase, {
      ...params,
      entry: {
        ...params.entry,
        description: "Second failed update",
        afterSnapshot: { title: "Version B" },
      },
    });

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);

    if (!first.ok && !second.ok) {
      expect(first.warning.reconciliationKey)
        .not.toBe(second.warning.reconciliationKey);

      expect(first.warning.reconciliationKey)
        .toMatch(/^history:.*:[a-f0-9]{64}$/);

      expect(second.warning.reconciliationKey)
        .toMatch(/^history:.*:[a-f0-9]{64}$/);
    }

    consoleError.mockRestore();
  });
});
