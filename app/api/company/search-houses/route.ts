import { NextResponse } from "next/server";
import { searchPublicHouses } from "@/src/modules/houses/services/searchPublicHouses";
import { logCompanySearchEvent } from "@/src/modules/company/actions/logCompanySearchEvent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get("q") ?? "").trim();

  if (q.length < 3) {
    return NextResponse.json({ items: [] });
  }

  const items = await searchPublicHouses(q);

  try {
    await logCompanySearchEvent({
      query: q,
      eventType: items.length > 0 ? "search" : "no_results",
      resultsCount: items.length,
      metadata: {
        source: "landing_search",
      },
    });
  } catch (error) {
    console.error("company search event log error", error);
  }

  return NextResponse.json({ items });
}
