import { cache } from "react";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

import type {
  HouseFaqItemSnapshot,
  HouseFaqLifecycleStatus,
  HouseFaqSnapshot,
} from "./getAdminHouseFaq";

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

export const getPublishedHouseFaq = cache(
  async (houseId: string): Promise<HouseFaqSnapshot | null> => {
    const supabase = await createSupabaseServerClient();

    const { data: faq, error: faqError } = await supabase
      .from("house_faq")
      .select("*")
      .eq("house_id", houseId)
      .eq("lifecycle_status", "published")
      .maybeSingle();

    if (faqError) {
      throw new Error(`Failed to load published house FAQ: ${faqError.message}`);
    }

    if (!faq) {
      return null;
    }

    const faqRow = faq as HouseFaqRow;

    const { data: items, error: itemsError } = await supabase
      .from("house_faq_items")
      .select("id, question, answer, sort_order")
      .eq("faq_id", faqRow.id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to load published house FAQ items: ${itemsError.message}`);
    }

    return mapFaq(faqRow, (items ?? []) as HouseFaqItemRow[]);
  },
);
