"use server";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type LogCompanySearchEventInput = {
  query: string;
  eventType: "search" | "no_results" | "result_click";
  matchedHouseId?: string | null;
  matchedHouseSlug?: string | null;
  resultsCount?: number;
  metadata?: Record<string, unknown>;
};

export async function logCompanySearchEvent(input: LogCompanySearchEventInput) {
  const query = String(input.query ?? "").trim();

  if (!query) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("company_search_events").insert({
    query,
    event_type: input.eventType,
    matched_house_id: input.matchedHouseId ?? null,
    matched_house_slug: input.matchedHouseSlug ?? null,
    results_count: Number.isFinite(input.resultsCount) ? input.resultsCount : 0,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to log company search event: ${error.message}`);
  }
}
