import type { ContentHandler } from "../../types/handler";

import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { deleteAllArchivedCommand } from "./commands/deleteAllArchived";
import { publishCommand } from "./commands/publish";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";

export const announcementsHandler: ContentHandler = {
  key: "announcements",
  workspace: "announcements",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    deleteAllArchived: deleteAllArchivedCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}`, `/house/${houseSlug}/announcements`];
  },
};
