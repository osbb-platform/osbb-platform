import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminHouseApartmentListItem = {
  id: string;
  house_id: string;
  account_number: string;
  apartment_label: string;
  owner_name: string;
  area: number | null;
  source_type: "import" | "manual";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_by: string | null;
};

export type AdminHouseApartmentsSummary = {
  activeCount: number;
  archivedCount: number;
  lastImportAt: string | null;
  lastImportActorName: string | null;
};

export type GetAdminHouseApartmentsParams = {
  houseId: string;
  archived?: boolean;
  includeArchivedSummary?: boolean;
};

type ApartmentRow = {
  id: string;
  house_id: string;
  account_number: string;
  apartment_label: string;
  owner_name: string;
  area: string | number | null;
  source_type: "import" | "manual";
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  created_by: string | null;
  creator: {
    full_name: string | null;
  } | null;
};

function normalizeArea(value: string | number | null) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

export async function getAdminHouseApartments({
  houseId,
  archived = false,
  includeArchivedSummary = true,
}: GetAdminHouseApartmentsParams): Promise<{
  items: AdminHouseApartmentListItem[];
  summary: AdminHouseApartmentsSummary;
}> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const archivedSummaryQuery = includeArchivedSummary
    ? supabase
        .from("house_apartments")
        .select("id")
        .eq("house_id", houseId)
        .not("archived_at", "is", null)
    : Promise.resolve({ data: [], error: null });

  const [
    { data: activeRows, error: activeError },
    { data: archivedRows, error: archivedError },
    { data: listRows, error: listError },
  ] = await Promise.all([
    supabase
      .from("house_apartments")
      .select("id, source_type, created_at, created_by, creator:profiles(full_name)")
      .eq("house_id", houseId)
      .is("archived_at", null),
    archivedSummaryQuery,
    archived
      ? supabase
          .from("house_apartments")
          .select(
            `
              id,
              house_id,
              account_number,
              apartment_label,
              owner_name,
              area,
              source_type,
              created_at,
              updated_at,
              archived_at,
              created_by
            `,
          )
          .eq("house_id", houseId)
          .not("archived_at", "is", null)
          .order("created_at", { ascending: false })
      : supabase
          .from("house_apartments")
          .select(
            `
              id,
              house_id,
              account_number,
              apartment_label,
              owner_name,
              area,
              source_type,
              created_at,
              updated_at,
              archived_at,
              created_by
            `,
          )
          .eq("house_id", houseId)
          .is("archived_at", null)
          .order("created_at", { ascending: false }),
  ]);

  if (activeError) {
    throw new Error(`Не вдалося завантажити зведення активних квартир: ${activeError.message}`);
  }

  if (archivedError) {
    throw new Error(`Не вдалося завантажити зведення архівних квартир: ${archivedError.message}`);
  }

  if (listError) {
    throw new Error(`Не вдалося завантажити список квартир: ${listError.message}`);
  }

  const activeItems = (activeRows ?? []) as unknown as ApartmentRow[];

  const lastImportRow =
    activeItems
      .filter((row) => row.source_type === "import")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0] ?? null;

  const items = ((listRows ?? []) as ApartmentRow[]).map((row) => ({
    id: row.id,
    house_id: row.house_id,
    account_number: row.account_number,
    apartment_label: row.apartment_label,
    owner_name: row.owner_name,
    area: normalizeArea(row.area),
    source_type: row.source_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
    created_by: row.created_by,
  }));

  return {
    items,
    summary: {
      activeCount: activeItems.length,
      archivedCount: (archivedRows ?? []).length,
      lastImportAt: lastImportRow?.created_at ?? null,
      lastImportActorName: lastImportRow?.creator?.full_name ?? null,
    },
  };
}
