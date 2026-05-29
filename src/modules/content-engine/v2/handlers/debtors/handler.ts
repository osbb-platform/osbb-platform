import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { deleteDraftCommand } from "./commands/deleteDraft";
import { saveDraftItemsCommand } from "./commands/saveDraftItems";
import { saveSettingsCommand } from "./commands/saveSettings";
import { publishDraftCommand } from "./commands/publishDraft";

export const debtorsHandler: ContentHandler = {
  key: "debtors",
  workspace: "debtors",

  commands: {
    saveSettings: saveSettingsCommand,
    saveDraftItems: saveDraftItemsCommand,
    publishDraft: publishDraftCommand,
    deleteDraft: deleteDraftCommand,
  },

  async onBootstrap(ctx) {
    const now = new Date().toISOString();

    const { error } = await ctx.supabase
      .from("house_debtors_settings")
      .upsert(
        {
          house_id: ctx.houseId,
          payment_url: "",
          payment_title: "Оплата заборгованості",
          payment_note: "",
          payment_button_label: "Сплатити",
          calculator_enabled: false,
          calculator_court_fee: "302.80",
          calculator_legal_aid: "1000",
          calculator_inflation_rate: "20",
          calculator_enforcement_rate: "10",
          calculator_title: "Калькулятор судових витрат",
          calculator_note: "",
          calculator_disclaimer: "",
          updated_at: now,
        },
        { onConflict: "house_id" },
      );

    if (error) {
      return err(error.message, "INTERNAL");
    }

    return ok(undefined);
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/debtors`, `/house/${houseSlug}`];
  },
};
