import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { saveCommand } from "./commands/save";

export const heroHandler: ContentHandler = {
  key: "hero",
  workspace: "announcements",

  commands: {
    save: saveCommand,
  },

  async onBootstrap(ctx) {
    const { error } = await ctx.supabase.from("house_hero").upsert(
      {
        house_id: ctx.houseId,
        headline: `Ласкаво просимо на сайт будинку ${ctx.houseName}`,
        cta_label: "Відкрити оголошення",
      },
      {
        onConflict: "house_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      return err(error.message, "INTERNAL");
    }

    return ok(undefined);
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}`];
  },
};
