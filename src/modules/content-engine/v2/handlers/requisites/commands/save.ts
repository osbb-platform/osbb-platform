import type { CommandSpec } from "../../../types/handler";
import { err, ok } from "../../../types/result";
import type { HouseRequisites, SaveRequisitesPayload } from "../types";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const saveCommand: CommandSpec = {
  actionKey: "edit",
  requiresLockCheck: true,

  async validate(rawPayload) {
    const payload = rawPayload as Partial<SaveRequisitesPayload>;

    if (typeof payload.lockVersion !== "number") {
      return err("Не передано версію реквізитів.", "VALIDATION_FAILED");
    }

    return ok(undefined);
  },

  async execute(rawPayload, ctx) {
    const payload = rawPayload as SaveRequisitesPayload;

    const { data: existing, error: existingError } = await ctx.supabase
      .from("house_requisites")
      .select("*")
      .eq("house_id", ctx.house.id)
      .maybeSingle();

    if (existingError) {
      return err(existingError.message, "INTERNAL");
    }

    const now = new Date().toISOString();

    if (!existing) {
      if (payload.lockVersion !== 1) {
        return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
      }

      const { data: created, error } = await ctx.supabase
        .from("house_requisites")
        .insert({
          house_id: ctx.house.id,
          recipient: normalizeText(payload.recipient),
          iban: normalizeText(payload.iban),
          edrpou: normalizeText(payload.edrpou),
          bank: normalizeText(payload.bank),
          purpose_template: normalizeText(payload.purposeTemplate),
          payment_url: normalizeText(payload.paymentUrl),
          payment_button_label:
            normalizeText(payload.paymentButtonLabel) || "Перейти до оплати",
          lock_version: 1,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (error) {
        return err(error.message, "INTERNAL");
      }

      const requisites = created as HouseRequisites;

      return ok({
        data: requisites,
        history: {
          entityType: "house_requisites",
          entityId: requisites.id,
          action: "created",
          description: "Створено реквізити будинку.",
          beforeSnapshot: null,
          afterSnapshot: requisites,
          metadata: {
            subSectionKey: "requisites",
          },
        },
      });
    }

    const current = existing as HouseRequisites;

    const { data: updated, error } = await ctx.supabase
      .from("house_requisites")
      .update({
        recipient: normalizeText(payload.recipient),
        iban: normalizeText(payload.iban),
        edrpou: normalizeText(payload.edrpou),
        bank: normalizeText(payload.bank),
        purpose_template: normalizeText(payload.purposeTemplate),
        payment_url: normalizeText(payload.paymentUrl),
        payment_button_label:
          normalizeText(payload.paymentButtonLabel) || "Перейти до оплати",
        lock_version: payload.lockVersion + 1,
        updated_at: now,
      })
      .eq("house_id", ctx.house.id)
      .eq("lock_version", payload.lockVersion)
      .select("*")
      .maybeSingle();

    if (error) {
      return err(error.message, "INTERNAL");
    }

    if (!updated) {
      return err("Дані застаріли, оновіть сторінку.", "STALE_CONTENT");
    }

    const requisites = updated as HouseRequisites;

    return ok({
      data: requisites,
      history: {
        entityType: "house_requisites",
        entityId: requisites.id,
        action: "updated",
        description: "Оновлено реквізити будинку.",
        beforeSnapshot: current,
        afterSnapshot: requisites,
        metadata: {
          subSectionKey: "requisites",
        },
      },
    });
  },
};
