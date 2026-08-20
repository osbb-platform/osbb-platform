import type { ContentHandler } from "../../types/handler";

import { archiveCommand } from "./commands/archive";
import { closePollCommand } from "./commands/closePoll";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { deleteAllArchivedCommand } from "./commands/deleteAllArchived";
import { openPollCommand } from "./commands/openPoll";
import { publishCommand } from "./commands/publish";
import { replaceQuestionsCommand } from "./commands/replaceQuestions";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";

export const pollsHandler: ContentHandler = {
  key: "polls",
  workspace: "polls",

  commands: {
    create: createCommand,
    update: updateCommand,
    replaceQuestions: replaceQuestionsCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    deleteAllArchived: deleteAllArchivedCommand,
    openPoll: openPollCommand,
    closePoll: closePollCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/polls`, `/house/${houseSlug}`];
  },
};
