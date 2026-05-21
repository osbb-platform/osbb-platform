import type { ContentHandler } from "../../types/handler";

import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { reorderCommand } from "./commands/reorder";
import { updateCommand } from "./commands/update";

export const boardMembersHandler: ContentHandler = {
  key: "board_members",
  workspace: "board",

  commands: {
    create: createCommand,
    update: updateCommand,
    delete: deleteCommand,
    reorder: reorderCommand,
  },

  publicRevalidatePaths(houseSlug) {
    return [`/house/${houseSlug}`, `/house/${houseSlug}/board`];
  },
};
