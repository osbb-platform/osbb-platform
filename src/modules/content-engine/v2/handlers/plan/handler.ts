import type { ContentHandler } from "../../types/handler";

import { addFilesCommand } from "./commands/addFiles";
import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { removeFilesCommand } from "./commands/removeFiles";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";
import { duplicateCommand } from "./commands/duplicate";
import { pauseAutomationCommand } from "./commands/pauseAutomation";
import { resumeAutomationCommand } from "./commands/resumeAutomation";
import { transitionStatusCommand } from "./commands/transitionStatus";

export const planHandler: ContentHandler = {
  key: "plan",
  workspace: "plan",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    pauseAutomation: pauseAutomationCommand,
    resumeAutomation: resumeAutomationCommand,
    transitionStatus: transitionStatusCommand,
    delete: deleteCommand,
    addFiles: addFilesCommand,
    removeFiles: removeFilesCommand,
    duplicate: duplicateCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/plan`];
  },
};
