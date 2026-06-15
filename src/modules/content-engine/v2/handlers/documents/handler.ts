import type { ContentHandler } from "../../types/handler";
import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { deleteAllArchivedCommand } from "./commands/deleteAllArchived";
import { publishCommand } from "./commands/publish";
import { replacePdfCommand } from "./commands/replacePdf";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";
import { duplicateCommand } from "./commands/duplicate";

export const documentsHandler: ContentHandler = {
  key: "documents",
  workspace: "information",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    deleteAllArchived: deleteAllArchivedCommand,
    replacePdf: replacePdfCommand,
    duplicate: duplicateCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [
      `/house/${houseSlug}/information`,
      `/house/${houseSlug}/founding-documents`,
    ];
  },
};
