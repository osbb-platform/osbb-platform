import { createSupabaseAdminClient } from "../../../../../../integrations/supabase/server/admin";

import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
  type MonthSnapshotIdAndLockPayload,
} from "../types";
import {
  buildPublicationPlanForSnapshot,
  getMonthSnapshot,
  mapDebtorHistoryRpcError,
  monthSnapshotHistoryMetadata,
  readMonthSnapshotIdAndLock,
} from "./historyShared";
import { publicDebtorsPaths } from "./shared";

export const publishMonthSnapshotCommand: CommandSpec = {
  actionKey: "publish",
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
        "Опублікувати можна лише чернетку місячного знімка.",
        "VALIDATION_FAILED",
      );
    }

    const planResult = await buildPublicationPlanForSnapshot(
      ctx,
      beforeResult.data,
    );
    if (!planResult.ok) return planResult;

    const plan = planResult.data;
    const adminSupabase = createSupabaseAdminClient();

    const { error } = await adminSupabase.rpc(
      "publish_house_debtor_month_snapshot",
      {
        p_house_id: ctx.house.id,
        p_snapshot_id: payload.id,
        p_expected_lock_version: payload.lockVersion,
        p_expected_published_snapshot_ids:
          plan.expectedPublishedSnapshotIds,
        p_series: plan.seriesRows,
        p_public_items: plan.publicItems,
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
        action: "debtors.month_published",
        description: "Опубліковано місячний знімок боргів.",
        beforeSnapshot: beforeResult.data,
        afterSnapshot: snapshot,
        metadata: monthSnapshotHistoryMetadata(snapshot, {
          latestPeriodYear: plan.latestPeriod.year,
          latestPeriodMonth: plan.latestPeriod.month,
          publicItemsCount: plan.publicItems.length,
        }),
      },
      extraRevalidatePaths: publicDebtorsPaths(ctx.house.slug),
    });
  },
};
