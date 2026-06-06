import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseFaqLifecycleStatus = "draft" | "published" | "archived";

export type HouseFaqItemSnapshot = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type HouseFaqSnapshot = {
  id: string;
  houseId: string;
  status: HouseFaqLifecycleStatus;
  items: HouseFaqItemSnapshot[];
  lockVersion: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
};

type HouseFaqRow = {
  id: string;
  house_id: string;
  lifecycle_status: HouseFaqLifecycleStatus;
  lock_version: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
};

type HouseFaqItemRow = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

function mapItem(row: HouseFaqItemRow): HouseFaqItemSnapshot {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  };
}

function mapFaq(row: HouseFaqRow, items: HouseFaqItemRow[]): HouseFaqSnapshot {
  return {
    id: row.id,
    houseId: row.house_id,
    status: row.lifecycle_status,
    items: items.map(mapItem),
    lockVersion: row.lock_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
  };
}

export async function getAdminHouseFaq(
  houseId: string,
): Promise<HouseFaqSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("house_faq")
    .select("*")
    .eq("house_id", houseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load admin house FAQ: ${existingError.message}`);
  }

  const faqRow = existing
    ? (existing as HouseFaqRow)
    : await (async () => {
        const { data: created, error: createError } = await supabase
          .from("house_faq")
          .insert({
            house_id: houseId,
            lifecycle_status: "draft",
          })
          .select("*")
          .single();

        if (createError) {
          throw new Error(`Failed to create admin house FAQ: ${createError.message}`);
        }

        return created as HouseFaqRow;
      })();

  const { data: items, error: itemsError } = await supabase
    .from("house_faq_items")
    .select("id, question, answer, sort_order")
    .eq("faq_id", faqRow.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load admin house FAQ items: ${itemsError.message}`);
  }

  return mapFaq(faqRow, (items ?? []) as HouseFaqItemRow[]);
}
