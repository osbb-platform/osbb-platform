import { revalidatePath } from "next/cache";

import type { ContentHandler } from "../types/handler";

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

  for (const path of paths) {
    revalidatePath(path);
  }
}
