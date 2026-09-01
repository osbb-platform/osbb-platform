import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type HistoryActor = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: string | null;
};

type HistoryEntry = {
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: Record<string, unknown>;
};

export type HistoryWriteParams = {
  actor: HistoryActor;
  houseId: string;
  entry: HistoryEntry;
};

export type HistoryWriteWarning = {
  code: "HISTORY_WRITE_FAILED";
  severity: "warning";
  nonFatal: true;
  houseId: string;
  entityType: string;
  entityId: string;
  action: string;
  reconciliationKey: string;
};

export type HistoryReconciliationRecord = {
  version: 1;
  kind: "house_content_history";
  reconciliationKey: string;
  payload: {
    actor_admin_id: string;
    actor_name: string;
    actor_email: string | null;
    actor_role: string | null;
    house_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    description: string;
    before_snapshot: unknown;
    after_snapshot: unknown;
    metadata: Record<string, unknown>;
  };
};

export type HistoryWriteSuccess = {
  ok: true;
};

export type HistoryWriteFailure = {
  ok: false;
  warning: HistoryWriteWarning;
  reconciliation: HistoryReconciliationRecord;
};

export type HistoryWriteResult = HistoryWriteSuccess | HistoryWriteFailure;

function buildHistoryPayload(params: HistoryWriteParams) {
  return {
    actor_admin_id: params.actor.id,
    actor_name: params.actor.fullName ?? params.actor.email ?? "Адміністратор",
    actor_email: params.actor.email,
    actor_role: params.actor.role,
    house_id: params.houseId,
    entity_type: params.entry.entityType,
    entity_id: params.entry.entityId,
    action: params.entry.action,
    description: params.entry.description,
    before_snapshot: params.entry.beforeSnapshot ?? null,
    after_snapshot: params.entry.afterSnapshot ?? null,
    metadata: params.entry.metadata ?? {},
  };
}

function buildFailure(
  params: HistoryWriteParams,
  payload: ReturnType<typeof buildHistoryPayload>,
): HistoryWriteFailure {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  const reconciliationKey = [
    "history",
    params.houseId,
    params.entry.entityType,
    params.entry.entityId,
    params.entry.action,
    payloadHash,
  ].join(":");

  return {
    ok: false,
    warning: {
      code: "HISTORY_WRITE_FAILED",
      severity: "warning",
      nonFatal: true,
      houseId: params.houseId,
      entityType: params.entry.entityType,
      entityId: params.entry.entityId,
      action: params.entry.action,
      reconciliationKey,
    },
    reconciliation: {
      version: 1,
      kind: "house_content_history",
      reconciliationKey,
      payload,
    },
  };
}

export async function writeHistory(
  supabase: SupabaseClient,
  params: HistoryWriteParams,
): Promise<HistoryWriteResult> {
  const payload = buildHistoryPayload(params);

  try {
    const { error } = await supabase
      .from("house_content_history")
      .insert(payload);

    if (!error) {
      return {
        ok: true,
      };
    }

    const failure = buildFailure(params, payload);

    console.error("writeHistory failed (non-blocking)", {
      warning: failure.warning,
      reconciliation: failure.reconciliation,
      error,
    });

    return failure;
  } catch (error) {
    const failure = buildFailure(params, payload);

    console.error("writeHistory failed (non-blocking)", {
      warning: failure.warning,
      reconciliation: failure.reconciliation,
      error,
    });

    return failure;
  }
}
