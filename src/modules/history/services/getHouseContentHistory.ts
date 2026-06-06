import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getActionLabel } from "@/src/modules/history/services/historyLabels";

export type HouseContentHistorySort = "date_desc" | "date_asc";

export type HouseContentHistoryItem = {
  id: string;
  occurred_at: string;
  actor_admin_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  house_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  action_label: string;
  description: string;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  diff: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};

export type HouseContentHistoryResult = {
  items: HouseContentHistoryItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type GetHouseContentHistoryParams = {
  houseId: string;
  page?: number;
  pageSize?: number;
  sort?: HouseContentHistorySort;
  entityType?: string;
  entityId?: string;
};

type HouseContentHistoryRow = {
  id: string;
  occurred_at: string;
  actor_admin_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  house_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description: string;
  before_snapshot: unknown;
  after_snapshot: unknown;
  diff: unknown;
  metadata: unknown;
};

function normalizeJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function mapHouseContentHistoryRow(
  row: HouseContentHistoryRow,
): HouseContentHistoryItem {
  return {
    id: row.id,
    occurred_at: row.occurred_at,
    actor_admin_id: row.actor_admin_id,
    actor_name: row.actor_name,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    house_id: row.house_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    action_label: getActionLabel(row.action),
    description: row.description,
    before_snapshot: normalizeJsonObject(row.before_snapshot),
    after_snapshot: normalizeJsonObject(row.after_snapshot),
    diff: normalizeJsonObject(row.diff),
    metadata: normalizeJsonObject(row.metadata) ?? {},
  };
}

/**
 * N2.T3 adapter stub for house-scoped content history.
 *
 * It intentionally is not wired to /admin/history yet.
 * N3+ handlers will write rows to house_content_history, and a later UI task
 * can consume this adapter.
 */
export async function getHouseContentHistory({
  houseId,
  page = 1,
  pageSize = 20,
  sort = "date_desc",
  entityType,
  entityId,
}: GetHouseContentHistoryParams): Promise<HouseContentHistoryResult> {
  noStore();

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 100)
      : 20;

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("house_content_history")
    .select(
      [
        "id",
        "occurred_at",
        "actor_admin_id",
        "actor_name",
        "actor_email",
        "actor_role",
        "house_id",
        "entity_type",
        "entity_id",
        "action",
        "description",
        "before_snapshot",
        "after_snapshot",
        "diff",
        "metadata",
      ].join(", "),
      { count: "exact" },
    )
    .eq("house_id", houseId);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }

  const { data, error, count } = await query
    .order("occurred_at", { ascending: sort === "date_asc" })
    .range(from, to);

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {
        items: [],
        totalCount: 0,
        totalPages: 0,
        page: safePage,
        pageSize: safePageSize,
      };
    }

    throw new Error(`Failed to load house content history: ${error.message}`);
  }

  const totalCount = count ?? 0;

  const rows = (data ?? []) as unknown as HouseContentHistoryRow[];

  return {
    items: rows.map(mapHouseContentHistoryRow),
    totalCount,
    totalPages: Math.ceil(totalCount / safePageSize),
    page: safePage,
    pageSize: safePageSize,
  };
}
