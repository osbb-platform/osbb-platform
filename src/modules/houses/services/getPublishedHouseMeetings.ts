import { cache } from "react";

import {
  loadPublishedHouseMeetingsRows,
  mapHouseMeetingSnapshot,
  type AdminHouseMeetingsSnapshot,
} from "./getAdminHouseMeetings";

export const getPublishedHouseMeetings = cache(
  async (houseId: string): Promise<AdminHouseMeetingsSnapshot> => {
    const rows = await loadPublishedHouseMeetingsRows(houseId);

    const items = rows.meetings.map((meeting) =>
      mapHouseMeetingSnapshot({
        meeting,
        questions: rows.questions,
        manualVotes: rows.manualVotes,
      }),
    );

    return {
      items,
      updatedAt:
        items.length > 0
          ? items.map((item) => item.updatedAt).sort().at(-1) ?? null
          : null,
    };
  },
);
