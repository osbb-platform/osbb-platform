import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type {
  SaveDebtorsDraftItemsPayload,
  SaveDebtorsDraftItemPayload,
} from "../types";
import { importMonthDraftCommand } from "./importMonthDraft";
import { normalizeDraftItems } from "./shared";

type LegacyManualPayload = SaveDebtorsDraftItemsPayload & {
  periodYear?: number;
  periodMonth?: number;
};

function getPreviousCalendarPeriod(now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    periodYear: date.getFullYear(),
    periodMonth: date.getMonth() + 1,
  };
}

function parseLegacyBalance(item: SaveDebtorsDraftItemPayload) {
  const value = Number(
    item.amount
      .trim()
      .replace(/\s+/gu, "")
      .replace(",", "."),
  );

  return Number.isFinite(value) ? value : null;
}

function toSnapshotPayload(rawPayload: unknown) {
  const payload = rawPayload as LegacyManualPayload;
  const items = normalizeDraftItems(payload.items);

  if (items.length === 0) {
    return err(
      "Додайте хоча б одну квартиру з боргом.",
      "VALIDATION_FAILED",
    );
  }

  const fallbackPeriod = getPreviousCalendarPeriod();

  const periodYear =
    Number.isInteger(payload.periodYear) &&
    Number(payload.periodYear) >= 2000 &&
    Number(payload.periodYear) <= 2100
      ? Number(payload.periodYear)
      : fallbackPeriod.periodYear;

  const periodMonth =
    Number.isInteger(payload.periodMonth) &&
    Number(payload.periodMonth) >= 1 &&
    Number(payload.periodMonth) <= 12
      ? Number(payload.periodMonth)
      : fallbackPeriod.periodMonth;

  const rows = [];

  for (const item of items) {
    const accountNumber = item.accountNumber?.trim() ?? "";
    const closingBalance = parseLegacyBalance(item);

    if (!accountNumber) {
      return err(
        `Для квартири ${item.apartmentLabel} відсутній особовий рахунок.`,
        "VALIDATION_FAILED",
      );
    }

    if (closingBalance === null) {
      return err(
        `Некоректний баланс для квартири ${item.apartmentLabel}.`,
        "VALIDATION_FAILED",
      );
    }

    rows.push({
      accountNumber,
      closingBalance,
      debtSourceValue:
        closingBalance < 0 ? Math.abs(closingBalance) : null,
    });
  }

  return ok({
    periodYear,
    periodMonth,
    source: "manual_edit" as const,
    importMeta: {
      flow: "legacy_manual_emergency",
      migratedToSnapshotModel: true,
    },
    rows,
  });
}

export const saveDraftItemsCommand: CommandSpec = {
  actionKey: "create",
  requiresLockCheck: false,

  async validate(rawPayload, ctx) {
    const converted = toSnapshotPayload(rawPayload);
    if (!converted.ok) return converted;

    return (
      (await importMonthDraftCommand.validate?.(converted.data, ctx)) ??
      ok(undefined)
    );
  },

  async execute(rawPayload, ctx) {
    const converted = toSnapshotPayload(rawPayload);
    if (!converted.ok) return converted;

    return importMonthDraftCommand.execute(converted.data, ctx);
  },
};
