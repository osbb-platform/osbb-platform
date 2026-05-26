import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseHomeWidget = {
  id: string;
  label: string;
  value: string;
};

export type HouseHomeWidgetsSnapshot = {
  id: string;
  houseId: string;
  statusWidgets: HouseHomeWidget[];
  lockVersion: number;
  updatedAt: string;
};

type HouseHomeWidgetsRow = {
  id: string;
  house_id: string;
  status_widgets: unknown;
  lock_version: number;
  updated_at: string;
};

function normalizeWidget(item: unknown): HouseHomeWidget | null {
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

function normalizeWidgets(value: unknown): HouseHomeWidget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeWidget)
    .filter((item): item is HouseHomeWidget => item !== null)
    .slice(0, 6);
}

const mapRow = (row: HouseHomeWidgetsRow): HouseHomeWidgetsSnapshot => ({
  id: row.id,
  houseId: row.house_id,
  statusWidgets: normalizeWidgets(row.status_widgets),
  lockVersion: row.lock_version,
  updatedAt: row.updated_at,
});

export async function getAdminHouseHomeWidgets(
  houseId: string,
): Promise<HouseHomeWidgetsSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("house_home_widgets")
    .select("*")
    .eq("house_id", houseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load admin house home widgets: ${existingError.message}`);
  }

  if (existing) {
    return mapRow(existing as HouseHomeWidgetsRow);
  }

  const { data: created, error: createError } = await supabase
    .from("house_home_widgets")
    .insert({
      house_id: houseId,
      status_widgets: [],
    })
    .select("*")
    .single();

  if (createError) {
    throw new Error(`Failed to create admin house home widgets: ${createError.message}`);
  }

  return mapRow(created as HouseHomeWidgetsRow);
}
