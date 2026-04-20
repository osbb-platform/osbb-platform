import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type CompanySearchStats = {
  totalSearches: number;
  noResults: number;
  resultClicks: number;
  topQueries: Array<{
    query: string;
    total: number;
  }>;
};

export async function getCompanySearchStats(): Promise<CompanySearchStats> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_search_events")
    .select("query, event_type")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {
        totalSearches: 0,
        noResults: 0,
        resultClicks: 0,
        topQueries: [],
      };
    }

    throw new Error(`Failed to load company search stats: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{ query: string; event_type: string }>;

  const queryMap = new Map<string, number>();

  let totalSearches = 0;
  let noResults = 0;
  let resultClicks = 0;

  for (const row of rows) {
    if (row.event_type === "search") {
      totalSearches += 1;
      queryMap.set(row.query, (queryMap.get(row.query) ?? 0) + 1);
    }

    if (row.event_type === "no_results") {
      noResults += 1;
      queryMap.set(row.query, (queryMap.get(row.query) ?? 0) + 1);
    }

    if (row.event_type === "result_click") {
      resultClicks += 1;
    }
  }

  const topQueries = Array.from(queryMap.entries())
    .map(([query, total]) => ({ query, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    totalSearches,
    noResults,
    resultClicks,
    topQueries,
  };
}
