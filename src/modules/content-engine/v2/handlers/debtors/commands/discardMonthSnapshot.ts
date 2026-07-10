import { createSupabaseAdminClient } from "../../../../../../integrations/supabase/server/admin";

import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
  type MonthSnapshotIdAndLockPayload,
} from "../types";
import {
  getMonthSnapshot,
  mapDebtorHistoryRpcError,
  monthSnapshotHistoryMetadata,
  readMonthSnapshotIdAndLock,
} from "./historyShared";

export const discardMonthSnapshotCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = readMonthSnapshotIdAndLock(rawPayload);
    return payload.ok ? ok(undefined) : payload;
  },

  async execute(rawPayload, ctx) {
    const payloadResult = readMonthSnapshotIdAndLock(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const payload = payloadResult.data as MonthSnapshotIdAndLockPayload;
    const beforeResult = await getMonthSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    if (beforeResult.data.snapshot.status !== "draft") {
      return err(
        "Відхилити можна лише чернетку місячного знімка.",
        "VALIDATION_FAILED",
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    const { error } = await adminSupabase.rpc(
      "discard_house_debtor_month_snapshot",
      {
        p_house_id: ctx.house.id,
        p_snapshot_id: payload.id,
        p_expected_lock_version: payload.lockVersion,
      },
    );

    if (error) {
      return mapDebtorHistoryRpcError(error.message);
    }

    const afterResult = await getMonthSnapshot(ctx, payload.id);
    if (!afterResult.ok) return afterResult;

    const snapshot = afterResult.data;

    return ok({
      data: snapshot,
      history: {
        entityType: HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
        entityId: snapshot.snapshot.id,
        action: "debtors.month_discarded",
        description: "Відхилено чернетку місячного знімка боргів.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: snapshot,
        metadata: monthSnapshotHistoryMetadata(snapshot),
      },
    });
  },
};
