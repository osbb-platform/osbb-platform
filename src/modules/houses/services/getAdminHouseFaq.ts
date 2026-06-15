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
  faq_id: string;
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

function mapFaq(
  row: HouseFaqRow,
  itemsByFaqId: Map<string, HouseFaqItemRow[]>,
): HouseFaqSnapshot {
  return {
    id: row.id,
    houseId: row.house_id,
    status: row.lifecycle_status,
    items: (itemsByFaqId.get(row.id) ?? []).map(mapItem),
    lockVersion: row.lock_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
  };
}

function getStatusRank(status: HouseFaqLifecycleStatus) {
  if (status === "draft") return 0;
  if (status === "published") return 1;
  return 2;
}

export async function getAdminHouseFaq(
  houseId: string,
): Promise<HouseFaqSnapshot[]> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: faqs, error: faqError } = await supabase
    .from("house_faq")
    .select("*")
    .eq("house_id", houseId)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (faqError) {
    throw new Error(`Failed to load admin house FAQ: ${faqError.message}`);
  }

  const faqRows = (faqs ?? []) as HouseFaqRow[];

  if (faqRows.length === 0) {
    return [];
  }

  const faqIds = faqRows.map((faq) => faq.id);

  const { data: items, error: itemsError } = await supabase
    .from("house_faq_items")
    .select("id, faq_id, question, answer, sort_order")
    .in("faq_id", faqIds)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load admin house FAQ items: ${itemsError.message}`);
  }

  const itemsByFaqId = new Map<string, HouseFaqItemRow[]>();

  for (const item of (items ?? []) as HouseFaqItemRow[]) {
    const group = itemsByFaqId.get(item.faq_id) ?? [];
    group.push(item);
    itemsByFaqId.set(item.faq_id, group);
  }

  return faqRows
    .slice()
    .sort((left, right) => {
      const statusDiff = getStatusRank(left.lifecycle_status) - getStatusRank(right.lifecycle_status);
      if (statusDiff !== 0) return statusDiff;

      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
    })
    .map((faq) => mapFaq(faq, itemsByFaqId));
}
