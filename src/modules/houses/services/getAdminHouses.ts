import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getHouseMessageUnreadCounts } from "@/src/modules/houses/services/getHouseMessageUnreadCounts";
import { getAdminCityScope } from "@/src/modules/auth/services/getAdminCityScope";
import { sortHousesByDisplayOrder } from "@/src/modules/houses/utils/houseNaturalOrder";

export type AdminHouseMessageListItem = {
  id: string;
  created_at: string;
  category: string;
  specialist_label: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  apartment: string;
  subject: string | null;
  comment: string | null;
  status: string;
};

export type AdminHouseListItem = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  object_kind: string;
  cover_image_path: string | null;
  cover_image_url?: string | null;
  tariff_amount: number | null;
  current_access_code: string | null;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  management_company_id: string;
  management_company: {
    id: string;
    slug: string;
    name: string;
    slogan: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    work_schedule: string | null;
    is_active: boolean;
  } | null;
  district: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  } | null;
  unread_messages_count: number;
  message_items: AdminHouseMessageListItem[];
};

export async function getAdminHouses(): Promise<AdminHouseListItem[]> {
  noStore();

  const [supabase, scope] = await Promise.all([
    createSupabaseServerClient(),
    getAdminCityScope(),
  ]);

  if (!scope || scope.houseIds.length === 0) {
    return [];
  }

  const [housesResult, unreadCountsResult, messagesResult] = await Promise.allSettled([
    supabase
      .from("houses")
      .select(
        `
          id,
          name,
          slug,
          address,
          osbb_name,
          short_description,
          public_description,
          object_kind,
          cover_image_path,
          tariff_amount,
          current_access_code,
          is_active,
          archived_at,
          created_at,
          management_company_id,
          management_company:management_companies (
            id,
            slug,
            name,
            slogan,
            phone,
            email,
            address,
            work_schedule,
            is_active
          ),
          district:districts (
            id,
            name,
            slug,
            theme_color
          )
        `,
      )
      .in("id", scope.houseIds)
      .order("created_at", { ascending: false }),
    getHouseMessageUnreadCounts(scope.houseIds),
    supabase
      .from("specialist_contact_requests")
      .select(
        [
          "id",
          "created_at",
          "house_id",
          "category",
          "specialist_label",
          "requester_name",
          "requester_email",
          "requester_phone",
          "apartment",
          "subject",
          "comment",
          "status",
        ].join(", "),
      )
      .in("house_id", scope.houseIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (housesResult.status === "rejected") {
    console.error("ADMIN_HOUSES_REQUIRED_READ_FAILED", { stage: "query" });
    throw new Error("Failed to load admin houses");
  }

  const { data, error } = housesResult.value;
  if (error) {
    console.error("ADMIN_HOUSES_REQUIRED_READ_FAILED", { stage: "response" });
    throw new Error("Failed to load admin houses");
  }

  let unreadCounts: Record<string, number> = {};
  if (unreadCountsResult.status === "fulfilled") {
    unreadCounts = unreadCountsResult.value;
  } else {
    console.error("ADMIN_HOUSES_OPTIONAL_READ_FAILED", { stage: "unread_counts" });
  }

  let messageData: unknown[] = [];
  if (messagesResult.status === "fulfilled" && !messagesResult.value.error) {
    messageData = messagesResult.value.data ?? [];
  } else {
    console.error("ADMIN_HOUSES_OPTIONAL_READ_FAILED", { stage: "messages" });
  }

  const messageMap = new Map<string, AdminHouseMessageListItem[]>();

  for (const row of ((messageData ?? []) as unknown as Array<Record<string, unknown>>)) {
    const houseId = String(row.house_id ?? "").trim();

    if (!houseId) {
      continue;
    }

    const bucket = messageMap.get(houseId) ?? [];
    bucket.push({
      id: String(row.id ?? ""),
      created_at: String(row.created_at ?? ""),
      category: String(row.category ?? ""),
      specialist_label: String(row.specialist_label ?? ""),
      requester_name: String(row.requester_name ?? ""),
      requester_email: String(row.requester_email ?? ""),
      requester_phone:
        typeof row.requester_phone === "string" ? row.requester_phone : null,
      apartment: String(row.apartment ?? ""),
      subject: typeof row.subject === "string" ? row.subject : null,
      comment: typeof row.comment === "string" ? row.comment : null,
      status: String(row.status ?? ""),
    });

    messageMap.set(houseId, bucket);
  }

  const typedData = ((data ?? []) as unknown as Omit<AdminHouseListItem, "unread_messages_count" | "message_items">[]).map(
    (item) => ({
      ...item,
      unread_messages_count: unreadCounts[item.id] ?? 0,
      message_items: (messageMap.get(item.id) ?? []).slice(0, 20),
    }),
  );

  for (const item of typedData) {
    if (item.cover_image_path) {
      const { data: publicUrlData } = supabase.storage
        .from("house-cover-images")
        .getPublicUrl(item.cover_image_path);

      item.cover_image_url = publicUrlData.publicUrl;
    } else {
      item.cover_image_url = null;
    }
  }

  return sortHousesByDisplayOrder(typedData);
}
