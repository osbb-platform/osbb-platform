import type { ContentHandler } from "../../types/handler";
import { ok } from "../../types/result";

import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { replaceItemsCommand } from "./commands/replaceItems";
import { restoreCommand } from "./commands/restore";
import { upsertCommand } from "./commands/upsert";
import { duplicateCommand } from "./commands/duplicate";
import { applyTemplateCommand } from "./commands/applyTemplate";

export const faqHandler: ContentHandler = {
  key: "faq",
  workspace: "information",

  commands: {
    create: createCommand,
    upsert: upsertCommand,
    replaceItems: replaceItemsCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    duplicate: duplicateCommand,
    applyTemplate: applyTemplateCommand,
  },

  async onBootstrap() {
    return ok(undefined);
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/information`];
  },
};
