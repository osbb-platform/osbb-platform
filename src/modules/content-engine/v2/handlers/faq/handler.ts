import type { ContentHandler } from "../../types/handler";
import { err, ok } from "../../types/result";

import { archiveCommand } from "./commands/archive";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { replaceItemsCommand } from "./commands/replaceItems";
import { restoreCommand } from "./commands/restore";
import { upsertCommand } from "./commands/upsert";
import { duplicateCommand } from "./commands/duplicate";

export const faqHandler: ContentHandler = {
  key: "faq",
  workspace: "information",

  commands: {
    upsert: upsertCommand,
    replaceItems: replaceItemsCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    duplicate: duplicateCommand,
  },

  async onBootstrap(ctx) {
    const { error } = await ctx.supabase.from("house_faq").upsert(
      {
        house_id: ctx.houseId,
        lifecycle_status: "draft",
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
    return [`/house/${houseSlug}/information`];
  },
};
