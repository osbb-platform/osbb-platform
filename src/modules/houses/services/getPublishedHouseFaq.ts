import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import type {
  HouseFaqItemSnapshot,
  HouseFaqLifecycleStatus,
  HouseFaqSnapshot,
} from "@/src/modules/houses/services/getAdminHouseFaq";

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

async function loadPublishedHouseFaq(houseId: string): Promise<HouseFaqSnapshot | null> {
  const supabase = createSupabasePublicClient();

  const { data: faq, error: faqError } = await supabase
    .from("house_faq")
    .select("*")
    .eq("house_id", houseId)
    .eq("lifecycle_status", "published")
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (faqError) {
    console.error("Failed to load published house FAQ:", {
      houseId,
      message: faqError.message,
    });
    return null;
  }

  if (!faq) {
    return null;
  }

  const faqRow = faq as HouseFaqRow;

  const { data: items, error: itemsError } = await supabase
    .from("house_faq_items")
    .select("id, faq_id, question, answer, sort_order")
    .eq("faq_id", faqRow.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (itemsError) {
    console.error("Failed to load published house FAQ items:", {
      houseId,
      faqId: faqRow.id,
      message: itemsError.message,
    });
    return mapFaq(faqRow, []);
  }

  return mapFaq(faqRow, (items ?? []) as HouseFaqItemRow[]);
}

export const getPublishedHouseFaq = cache(
  async (houseId: string): Promise<HouseFaqSnapshot | null> => {
    return unstable_cache(
      () => loadPublishedHouseFaq(houseId),
      ["published-house-faq", houseId],
      {
        tags: [`house:${houseId}:faq`, `house:${houseId}:information`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
