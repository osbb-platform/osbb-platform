import type { ContentHandler } from "../../types/handler";
import { upsertCommand } from "./commands/upsert";
import { deleteCommand } from "./commands/delete";

export const templatesHandler: ContentHandler = {
  key: "templates",
  workspace: "information",
  commands: {
    upsert: upsertCommand,
    delete: deleteCommand,
  },
};
