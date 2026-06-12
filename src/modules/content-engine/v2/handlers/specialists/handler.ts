import type { ContentHandler } from "../../types/handler";

import { archiveCommand } from "./commands/archive";
import { categoriesUpsertCommand } from "./commands/categoriesUpsert";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";
import { duplicateCommand } from "./commands/duplicate";

export const specialistsHandler: ContentHandler = {
  key: "specialists",
  workspace: "specialists",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    confirm: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    categoriesUpsert: categoriesUpsertCommand,
    duplicate: duplicateCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/specialists`];
  },
};
