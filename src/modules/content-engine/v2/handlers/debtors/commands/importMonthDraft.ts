import { createSupabaseAdminClient } from "../../../../../../integrations/supabase/server/admin";

import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import {
  HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
  type ImportMonthDraftPayload,
} from "../types";
import {
  getMissingRegistryAccounts,
  getMonthSnapshot,
  mapDebtorHistoryRpcError,
  monthSnapshotHistoryMetadata,
  normalizeImportMonthPayload,
} from "./historyShared";

export const importMonthDraftCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = normalizeImportMonthPayload(rawPayload);
    return payload.ok ? ok(undefined) : payload;
  },

  async execute(rawPayload, ctx) {
    const payloadResult = normalizeImportMonthPayload(rawPayload);
    if (!payloadResult.ok) return payloadResult;

    const payload = payloadResult.data as ImportMonthDraftPayload;

    const adminSupabase = createSupabaseAdminClient();

    const { data, error } = await adminSupabase.rpc(
      "import_house_debtor_month_draft",
      {
        p_house_id: ctx.house.id,
        p_created_by: ctx.user.id,
        p_period_year: payload.periodYear,
        p_period_month: payload.periodMonth,
        p_source: payload.source ?? "manual_import",
        p_import_meta: payload.importMeta ?? {},
        p_rows: payload.rows,
      },
    );

    if (error) {
      return mapDebtorHistoryRpcError(error.message);
    }

    if (typeof data !== "string") {
      return err("Не вдалося визначити створений знімок.", "INTERNAL");
    }

    const snapshotResult = await getMonthSnapshot(ctx, data);
    if (!snapshotResult.ok) return snapshotResult;

    const missingResult = await getMissingRegistryAccounts(
      ctx,
      payload.rows.map((row) => row.accountNumber),
    );
    if (!missingResult.ok) return missingResult;

    const snapshot = snapshotResult.data;

    return ok({
      data: {
        ...snapshot,
        warnings: {
          missingRegistryAccountNumbers: missingResult.data,
        },
      },
      history: {
        entityType: HOUSE_DEBTOR_MONTH_SNAPSHOT_ENTITY_TYPE,
        entityId: snapshot.snapshot.id,
        action: "debtors.month_imported",
        description: "Створено чернетку місячного знімка боргів.",
        afterSnapshot: snapshot,
        metadata: monthSnapshotHistoryMetadata(snapshot, {
          missingRegistryRowsCount: missingResult.data.length,
        }),
      },
    });
  },
};
