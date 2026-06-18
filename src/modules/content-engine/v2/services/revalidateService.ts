import { revalidatePath, revalidateTag } from "next/cache";

import type { ContentHandler } from "../types/handler";

const handlerSectionTags: Record<string, string[]> = {
  announcements: ["announcements"],
  board_intro: ["board", "board_intro"],
  board_members: ["board", "board_members"],
  debtors: ["debtors"],
  documents: ["documents"],
  faq: ["faq", "information"],
  hero: ["hero"],
  home_widgets: ["home_widgets"],
  information_posts: ["information_posts", "information"],
  meetings: ["meetings"],
  plan: ["plan"],
  reports: ["reports"],
  requisites: ["requisites"],
  specialists: ["specialists"],
};

export async function revalidateForCommand(params: {
  handler: ContentHandler;
  houseId: string;
  houseSlug: string;
  extraPaths?: string[];
}) {
  const paths = new Set<string>();

  paths.add("/admin/tasks");
  paths.add(`/admin/houses/${params.houseId}`);

  if (params.handler.publicRevalidatePaths) {
    for (const path of params.handler.publicRevalidatePaths(params.houseSlug)) {
      paths.add(path);
    }
  }

  for (const path of params.extraPaths ?? []) {
    paths.add(path);
  }

  const tags = new Set<string>();

  tags.add(`house:${params.houseId}`);
  tags.add(`house-slug:${params.houseSlug}`);

  for (const section of handlerSectionTags[params.handler.key] ?? [params.handler.key]) {
    tags.add(`house:${params.houseId}:${section}`);
  }

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  for (const path of paths) {
    revalidatePath(path);
  }
}
