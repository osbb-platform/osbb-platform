import type { ContentHandler } from "../../types/handler";

import { addFilesCommand } from "./commands/addFiles";
import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { removeFilesCommand } from "./commands/removeFiles";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";

export const planHandler: ContentHandler = {
  key: "plan",
  workspace: "plan",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    addFiles: addFilesCommand,
    removeFiles: removeFilesCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/plan`];
  },
};
