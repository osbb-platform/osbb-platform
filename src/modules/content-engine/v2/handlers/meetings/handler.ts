import type { ContentHandler } from "../../types/handler";

import { archiveCommand } from "./commands/archive";
import { createCommand } from "./commands/create";
import { closeVotingCommand } from "./commands/closeVoting";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { openVotingCommand } from "./commands/openVoting";
import { recordManualVoteCommand } from "./commands/recordManualVote";
import { replaceQuestionsCommand } from "./commands/replaceQuestions";
import { restoreCommand } from "./commands/restore";
import { updateCommand } from "./commands/update";

export const meetingsHandler: ContentHandler = {
  key: "meetings",
  workspace: "meetings",

  commands: {
    create: createCommand,
    update: updateCommand,
    publish: publishCommand,
    archive: archiveCommand,
    restore: restoreCommand,
    delete: deleteCommand,
    replaceQuestions: replaceQuestionsCommand,
    recordManualVote: recordManualVoteCommand,
    openVoting: openVotingCommand,
    closeVoting: closeVotingCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}/meetings`, `/house/${houseSlug}`];
  },
};
