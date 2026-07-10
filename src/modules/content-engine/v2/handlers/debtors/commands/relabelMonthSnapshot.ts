import { createSupabaseAdminClient } from "../../../../../../integrations/supabase/server/admin";

import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
  type RelabelMonthSnapshotPayload,
} from "../types";
import {
  getMonthSnapshot,
  mapDebtorHistoryRpcError,
  monthSnapshotHistoryMetadata,
  readRelabelMonthPayload,
} from "./historyShared";

export const relabelMonthSnapshotCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = readRelabelMonthPayload(rawPayload);
    return payload.ok ? ok(undefined) : payload;
  },

  async execute(rawPayload, ctx) {
    const payloadResult = readRelabelMonthPayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const payload = payloadResult.data as RelabelMonthSnapshotPayload;
    const beforeResult = await getMonthSnapshot(ctx, payload.id);
    if (!beforeResult.ok) return beforeResult;

    if (beforeResult.data.snapshot.status !== "draft") {
      return err(
        "Змінити період можна лише для чернетки.",
        "VALIDATION_FAILED",
      );
    }

    if (
      beforeResult.data.snapshot.period_year === payload.periodYear &&
      beforeResult.data.snapshot.period_month === payload.periodMonth
    ) {
      return err(
        "Новий період збігається з поточним.",
        "VALIDATION_FAILED",
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    const { error } = await adminSupabase.rpc(
      "relabel_house_debtor_month_snapshot",
      {
        p_house_id: ctx.house.id,
        p_snapshot_id: payload.id,
        p_expected_lock_version: payload.lockVersion,
        p_period_year: payload.periodYear,
        p_period_month: payload.periodMonth,
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
        action: "debtors.month_relabelled",
        description: "Змінено період чернетки місячного знімка боргів.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: snapshot,
        metadata: monthSnapshotHistoryMetadata(snapshot, {
          previousPeriodYear: beforeResult.data.snapshot.period_year,
          previousPeriodMonth: beforeResult.data.snapshot.period_month,
          previousRevision: beforeResult.data.snapshot.revision,
        }),
      },
    });
  },
};
