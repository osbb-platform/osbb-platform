import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  throwRequiredPublicReadError,
} from "./publicContentResilience";

type BellSourceKind =
  | "announcements"
  | "information"
  | "meetings"
  | "plan"
  | "reports"
  | "documents"
  | "board"
  | "requisites"
  | "specialists"
  | "debtors";

export type PublicHouseBellItem = {
  id: string;
  section: string;
  text: string;
  date: string;
  timestamp: number;
  source: BellSourceKind;
};

export type PublicHouseBellFeed = {
  total: number;
  items: PublicHouseBellItem[];
};

type BellFeedRpcRow = {
  section: BellSourceKind;
  latest_at: string | null;
  item_count: number | null;
};

const MAX_ITEMS = 10;
const WINDOW_DAYS = 7;

const sectionLabels: Record<BellSourceKind, string> = {
  announcements: "Оголошення",
  information: "Інформація",
  meetings: "Збори",
  plan: "План робіт",
  reports: "Звіти",
  documents: "Документи",
  board: "Правління",
  requisites: "Реквізити",
  specialists: "Спеціалісти",
  debtors: "Нарахування та боржники",
};

function toTimestamp(value: unknown): number {
  if (typeof value !== "string" || !value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "Нещодавно";

  return new Date(timestamp).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeCount(value: number | null | undefined) {
  return Math.max(Number(value ?? 0), 0);
}

function buildBellText(source: BellSourceKind, count: number) {
  switch (source) {
    case "announcements":
      return count === 1
        ? "Опубліковано нове оголошення"
        : `Добавлено ${count} новых объявлений`;
    case "board":
      return "Оновлено склад правління";
    case "requisites":
      return "Оновлено реквізити";
    case "specialists":
      return "Оновлено список спеціалістів";
    case "meetings":
      return count === 1
        ? "Додано нові збори"
        : `Добавлено ${count} новых собрания`;
    case "debtors":
      return "Опубліковано новий список заборгованості";
    case "plan":
      return count === 1
        ? "Додано нову задачу"
        : `Добавлено ${count} новых задач`;
    case "information":
      return count === 1
        ? "Додано новий інформаційний матеріал"
        : `Добавлено ${count} новых информационных материалов`;
    case "reports":
      return count === 1
        ? "Додано новий звіт"
        : `Добавлено ${count} новых отчетов`;
    case "documents":
      return count === 1
        ? "Додано новий документ"
        : `Добавлено ${count} новых документов`;
  }
}

async function loadPublicHouseBellFeed({
  houseId,
}: {
  houseId: string;
}): Promise<PublicHouseBellFeed> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase.rpc("get_house_bell_feed", {
    target_house_id: houseId,
    window_days: WINDOW_DAYS,
  });

  if (error) {
    throwRequiredPublicReadError({
      section: "bell_feed",
      resource: "get_house_bell_feed",
      houseId,
      error,
    });
  }

  const rows = (data ?? []) as BellFeedRpcRow[];

  const items = rows
    .map((row): PublicHouseBellItem | null => {
      const timestamp = toTimestamp(row.latest_at);
      const count = normalizeCount(row.item_count);

      if (!timestamp || !count) {
        return null;
      }

      return {
        id: `${houseId}-${row.section}`,
        section: sectionLabels[row.section],
        text: buildBellText(row.section, count),
        date: formatDate(timestamp),
        timestamp,
        source: row.section,
      };
    })
    .filter((item): item is PublicHouseBellItem => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    total: items.length,
    items: items.slice(0, MAX_ITEMS),
  };
}

export const getPublicHouseBellFeed = cache(
  async ({ houseId }: { houseId: string }): Promise<PublicHouseBellFeed> => {
    return unstable_cache(
      () => loadPublicHouseBellFeed({ houseId }),
      ["public-house-bell-feed-v2", houseId],
      {
        tags: [`house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
