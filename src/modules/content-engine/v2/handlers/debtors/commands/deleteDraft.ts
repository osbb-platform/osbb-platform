import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseDebtorMonthSnapshot } from "../types";
import { discardMonthSnapshotCommand } from "./discardMonthSnapshot";

async function getLatestDraft(ctx: Parameters<
  NonNullable<typeof discardMonthSnapshotCommand.execute>
>[1]) {
  const { data, error } = await ctx.supabase
    .from("house_debtor_month_snapshots")
    .select("*")
    .eq("house_id", ctx.house.id)
    .eq("status", "draft")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return err(
      "Не вдалося завантажити чернетку боржників.",
      "INTERNAL",
    );
  }

  if (!data) {
    return err("Чернетка боржників порожня.", "VALIDATION_FAILED");
  }

  return ok(data as HouseDebtorMonthSnapshot);
}

export const deleteDraftCommand: CommandSpec = {
  actionKey: "delete",
  requiresLockCheck: false,

  async execute(_rawPayload, ctx) {
    const draft = await getLatestDraft(ctx);
    if (!draft.ok) return draft;

    return discardMonthSnapshotCommand.execute(
      {
        id: draft.data.id,
        lockVersion: draft.data.lock_version,
      },
      ctx,
    );
  },
};
