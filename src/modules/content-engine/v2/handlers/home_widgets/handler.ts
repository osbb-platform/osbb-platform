import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { saveCommand } from "./commands/save";

export const homeWidgetsHandler: ContentHandler = {
  key: "home_widgets",
  workspace: "announcements",

  commands: {
    save: saveCommand,
  },

  async onBootstrap(ctx) {
    const { error } = await ctx.supabase.from("house_home_widgets").upsert(
      {
        house_id: ctx.houseId,
        status_widgets: [],
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
