import type { ContentHandler } from "../../types/handler";

import { archiveCommand } from "./commands/archive";
import { categoriesUpsertCommand } from "./commands/categoriesUpsert";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { deleteAllArchivedCommand } from "./commands/deleteAllArchived";
import { publishCommand } from "./commands/publish";
import { removePdfCommand } from "./commands/removePdf";
import { replacePdfCommand } from "./commands/replacePdf";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";

export const reportsHandler: ContentHandler = {
  key: "reports",
  workspace: "reports",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    deleteAllArchived: deleteAllArchivedCommand,
    replacePdf: replacePdfCommand,
    removePdf: removePdfCommand,
    categoriesUpsert: categoriesUpsertCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}`, `/house/${houseSlug}/reports`];
  },
};
