import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { saveCommand } from "./commands/save";

export const boardIntroHandler: ContentHandler = {
  key: "board_intro",
  workspace: "board",

  commands: {
    save: saveCommand,
  },

  async onBootstrap(ctx) {
    const { error } = await ctx.supabase.from("house_board_intro").upsert(
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
    return [`/house/${houseSlug}`, `/house/${houseSlug}/board`];
  },
};
