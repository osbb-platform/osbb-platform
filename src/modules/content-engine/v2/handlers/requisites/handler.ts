import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { saveCommand } from "./commands/save";

export const requisitesHandler: ContentHandler = {
  key: "requisites",
  workspace: "requisites",

  commands: {
    save: saveCommand,
  },

  async onBootstrap(ctx) {
    const { error } = await ctx.supabase.from("house_requisites").upsert(
      {
        house_id: ctx.houseId,
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
    return [`/house/${houseSlug}/requisites`];
  },
};
