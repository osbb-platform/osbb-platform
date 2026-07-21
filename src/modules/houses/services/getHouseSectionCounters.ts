import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseSectionCounterValue = {
  warning?: number;
  info?: number;
};

export type HouseSectionCounters = Partial<
  Record<
    | "announcements"
    | "information"
    | "reports"
    | "debtors"
    | "plan"
    | "meetings"
    | "specialists"
    | "board"
    | "requisites"
    | "founding-documents",
    HouseSectionCounterValue
  >
>;

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

function requireCount(label: string, result: CountResult) {
  if (result.error) {
    throw new Error(`Failed to load ${label} counter: ${result.error.message}`);
  }

  return result.count ?? 0;
}

export async function getHouseSectionCounters(
  houseId: string,
): Promise<HouseSectionCounters> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const [
    announcements,
    informationPosts,
    informationFaq,
    reports,
    debtors,
    plan,
    meetings,
    specialists,
    specialistRequests,
  ] = await Promise.all([
    supabase
      .from("house_announcements")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_information_posts")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_faq")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_reports")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_debtors_items")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_plan_tasks")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_meetings")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("house_specialists")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("lifecycle_status", "draft"),
    supabase
      .from("specialist_contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("status", "new"),
  ]);

  const counters: HouseSectionCounters = {
    announcements: {
      warning: requireCount("announcements", announcements),
    },
    information: {
      warning:
        requireCount("information posts", informationPosts) +
        requireCount("information FAQ", informationFaq),
    },
    reports: {
      warning: requireCount("reports", reports),
    },
    debtors: {
      warning: requireCount("debtors", debtors),
    },
    plan: {
      warning: requireCount("plan", plan),
    },
    meetings: {
      warning: requireCount("meetings", meetings),
    },
    specialists: {
      warning: requireCount("specialists", specialists),
      info: requireCount("specialist requests", specialistRequests),
    },
  };

  return Object.fromEntries(
    Object.entries(counters).filter(([, value]) =>
      Boolean((value.warning ?? 0) > 0 || (value.info ?? 0) > 0),
    ),
  ) as HouseSectionCounters;
}
