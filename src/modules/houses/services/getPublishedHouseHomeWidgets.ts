import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  throwRequiredPublicReadError,
} from "./publicContentResilience";

import type { HouseHomeWidgetsSnapshot } from "./getAdminHouseHomeWidgets";

type HouseHomeWidgetsPublicRow = {
  id: string;
  house_id: string;
  status_widgets: unknown;
  lock_version: number;
  updated_at: string;
};

function normalizeWidget(item: unknown) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const value = typeof record.value === "string" ? record.value.trim() : "";

  if (!label || !value) {
    return null;
  }

  return {
    id: id || `widget-${label}-${value}`,
    label: label.slice(0, 30),
    value,
  };
}

function normalizeWidgets(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeWidget)
    .filter((item): item is { id: string; label: string; value: string } => item !== null)
    .slice(0, 6);
}

const mapRow = (row: HouseHomeWidgetsPublicRow): HouseHomeWidgetsSnapshot => ({
  id: row.id,
  houseId: row.house_id,
  statusWidgets: normalizeWidgets(row.status_widgets),
  lockVersion: row.lock_version,
  updatedAt: row.updated_at,
});

async function loadPublishedHouseHomeWidgets(
  houseId: string,
): Promise<HouseHomeWidgetsSnapshot | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_home_widgets")
    .select("id, house_id, status_widgets, lock_version, updated_at")
    .eq("house_id", houseId)
    .maybeSingle();

  if (error) {
    throwRequiredPublicReadError({
      section: "home_widgets",
      resource: "house_home_widgets",
      houseId,
      error,
    });
  }

  if (!data) {
    return null;
  }

  return mapRow(data as HouseHomeWidgetsPublicRow);
}

export const getPublishedHouseHomeWidgets = cache(
  async (houseId: string): Promise<HouseHomeWidgetsSnapshot | null> => {
    return unstable_cache(
      () => loadPublishedHouseHomeWidgets(houseId),
      ["published-house-home-widgets-v2", houseId],
      {
        tags: [`house:${houseId}:home_widgets`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
