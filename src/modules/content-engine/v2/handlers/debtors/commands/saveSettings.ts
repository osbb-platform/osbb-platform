import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseDebtorsSettings, SaveDebtorsSettingsPayload } from "../types";
import {
  debtorsHistoryMetadata,
  ensureDebtorsSettings,
  getDebtorsSettings,
  HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE,
  normalizeCalculator,
  normalizePayment,
  publicDebtorsPaths,
} from "./shared";

export const saveSettingsCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: false,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveDebtorsSettingsPayload>;
    const paymentUrl = payload.payment?.url?.trim();

    if (paymentUrl && !/^https?:\/\//i.test(paymentUrl)) {
      return err("Посилання оплати має починатися з http:// або https://.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveDebtorsSettingsPayload;
    const beforeResult = await getDebtorsSettings(ctx);
    if (!beforeResult.ok) return beforeResult;

    const before = beforeResult.data;
    const baseResult = await ensureDebtorsSettings(ctx);
    if (!baseResult.ok) return baseResult;

    const base = baseResult.data;
    const payment = normalizePayment(payload.payment, base);
    const calculator = normalizeCalculator(payload.calculator, base);
    const now = new Date().toISOString();
    const expectedLockVersion =
      typeof payload.lockVersion === "number" ? payload.lockVersion : base.lock_version;

    const { data, error } = await ctx.supabase
      .from("house_debtors_settings")
      .update({
        payment_url: payment.url,
        payment_title: payment.title,
        payment_note: payment.note,
        payment_button_label: payment.buttonLabel,
        calculator_enabled: calculator.enabled,
        calculator_court_fee: calculator.courtFee,
        calculator_legal_aid: calculator.legalAid,
        calculator_inflation_rate: calculator.inflationRate,
        calculator_enforcement_rate: calculator.enforcementRate,
        calculator_title: calculator.title,
        calculator_note: calculator.note,
        calculator_disclaimer: calculator.disclaimer,
        lock_version: expectedLockVersion + 1,
        updated_at: now,
      })
      .eq("id", base.id)
      .eq("house_id", ctx.house.id)
      .eq("lock_version", expectedLockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!data) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const settings = data as HouseDebtorsSettings;

    return ok({
      data: settings,
      history: {
        entityType: HOUSE_DEBTORS_SETTINGS_ENTITY_TYPE,
        entityId: settings.id,
        action: before ? "updated" : "created",
        description: "Оновлено налаштування розділу боржників.",
        beforeSnapshot: before,
        afterSnapshot: settings,
        metadata: debtorsHistoryMetadata(),
      },
      extraRevalidatePaths: publicDebtorsPaths(ctx.house.slug),
    });
  },
};
