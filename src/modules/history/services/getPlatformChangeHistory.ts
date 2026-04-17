import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import {
  getActionLabel,
  getMainSectionLabel,
  getSubSectionLabel,
  inferMainSectionKey,
  inferSubSectionKey,
} from "@/src/modules/history/services/historyLabels";

export type PlatformHistoryTab = "all" | "cms" | "incoming";
export type PlatformHistorySort = "date_desc" | "date_asc";

export type PlatformChangeHistoryItem = {
  id: string;
  created_at: string;
  actor_admin_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action_type: string;
  action_label: string;
  description: string;
  source_type: "cms" | "house_portal";
  main_section_key: string;
  main_section_label: string;
  sub_section_key: string;
  sub_section_label: string;
  house_id: string | null;
  house_slug: string | null;
  house_name: string | null;
  metadata: Record<string, unknown>;
};

export type PlatformChangeHistoryResult = {
  items: PlatformChangeHistoryItem[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

type GetPlatformChangeHistoryParams = {
  tab?: PlatformHistoryTab;
  page?: number;
  pageSize?: number;
  sort?: PlatformHistorySort;
  actor?: string;
  mainSection?: string;
  subSection?: string;
  districtHouseIds?: string[];
  houseId?: string;
  dateFrom?: string;
  dateTo?: string;
};

const CMS_RETENTION_DAYS = 60;
const INCOMING_RETENTION_DAYS = 90;

type HistoryQueryLike = {
  or(expression: string): HistoryQueryLike;
  gte(column: string, value: string): HistoryQueryLike;
  lte(column: string, value: string): HistoryQueryLike;
  eq(column: string, value: string): HistoryQueryLike;
  filter(column: string, operator: string, value: string): HistoryQueryLike;
  order(column: string, options: { ascending: boolean }): HistoryQueryLike;
  range(from: number, to: number): HistoryQueryLike;
};

type HistoryRowLike = {
  id: string;
  created_at: string;
  actor_admin_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  action_type: string;
  description: string;
  metadata: unknown;
};

function parseIsoDate(value: string | undefined, fallbackToEndOfDay = false) {
  if (!value) return null;

  const date = new Date(
    fallbackToEndOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getRetentionStart(tab: PlatformHistoryTab) {
  const now = Date.now();
  const days =
    tab === "cms"
      ? CMS_RETENTION_DAYS
      : tab === "incoming"
        ? INCOMING_RETENTION_DAYS
        : INCOMING_RETENTION_DAYS;

  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

function applyIncomingSourceFilter(query: HistoryQueryLike) {
  return query.or(
    [
      "metadata->>sourceType.eq.house_portal",
      "actor_role.eq.resident_request",
      "actor_role.eq.resident",
    ].join(","),
  );
}

function applyCmsMainSectionFilter(query: HistoryQueryLike, mainSection: string) {
  if (mainSection === "districts") {
    return query.or(
      [
        "metadata->>mainSectionKey.eq.districts",
        "metadata->>mainSectionKey.eq.settings",
        "entity_type.eq.district",
        "action_type.ilike.%district%",
      ].join(","),
    );
  }

  if (mainSection === "houses") {
    return query.or(
      [
        "metadata->>mainSectionKey.eq.houses",
        "metadata->>mainSectionKey.eq.house_portal",
        "entity_type.in.(house,house_section,house_document,specialist,specialist_contact_request,house_access_session)",
        "action_type.ilike.%house%",
        "action_type.ilike.%specialist%",
        "action_type.ilike.%meeting%",
        "action_type.ilike.%report%",
        "action_type.ilike.%plan%",
        "action_type.ilike.%requisite%",
        "action_type.ilike.%debtor%",
      ].join(","),
    );
  }

  if (mainSection === "apartments") {
    return query.or(
      [
        "metadata->>mainSectionKey.eq.apartments",
        "entity_type.eq.apartment",
        "action_type.ilike.%apartment%",
      ].join(","),
    );
  }

  if (mainSection === "employees") {
    return query.or(
      [
        "metadata->>mainSectionKey.eq.employees",
        "metadata->>mainSectionKey.eq.system",
        "entity_type.eq.employee",
        "action_type.ilike.%employee%",
      ].join(","),
    );
  }

  return query.filter("metadata->>mainSectionKey", "eq", mainSection);
}

function applySubSectionFilter(query: HistoryQueryLike, subSection: string) {
  if (subSection === "information") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.information",
        "metadata->>subSectionKey.eq.faq",
        "metadata->>subSectionKey.eq.documents",
        "metadata->>kind.eq.rich_text",
        "metadata->>kind.eq.faq",
        "entity_type.eq.information",
        "entity_type.eq.house_document",
        "action_type.ilike.%information%",
        "action_type.ilike.%faq%",
        "action_type.ilike.%document%",
      ].join(","),
    );
  }

  if (subSection === "announcements") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.announcements",
        "metadata->>kind.eq.announcements",
        "entity_type.eq.announcement",
        "action_type.ilike.%announcement%",
      ].join(","),
    );
  }

  if (subSection === "board") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.board",
        "metadata->>kind.eq.contacts",
      ].join(","),
    );
  }

  if (subSection === "specialists") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.specialists",
        "entity_type.eq.specialist",
        "action_type.ilike.%specialist%",
      ].join(","),
    );
  }

  if (subSection === "access") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.access",
        "entity_type.eq.house_access_session",
        "action_type.ilike.%access%",
        "action_type.eq.house_login",
      ].join(","),
    );
  }

  if (subSection === "plan") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.plan",
        "metadata->>kind.eq.plan",
        "action_type.ilike.%plan%",
      ].join(","),
    );
  }

  if (subSection === "reports") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.reports",
        "metadata->>kind.eq.reports",
        "action_type.ilike.%report%",
      ].join(","),
    );
  }

  if (subSection === "requisites") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.requisites",
        "metadata->>kind.eq.requisites",
      ].join(","),
    );
  }

  if (subSection === "debtors") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.debtors",
        "metadata->>kind.eq.debtors",
        "action_type.ilike.%debtor%",
      ].join(","),
    );
  }

  if (subSection === "meetings") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.meetings",
        "metadata->>kind.eq.meetings",
        "action_type.ilike.%meeting%",
      ].join(","),
    );
  }

  if (subSection === "apartments") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.apartments",
        "entity_type.eq.apartment",
        "action_type.ilike.%apartment%",
      ].join(","),
    );
  }

  if (subSection === "employees") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.employees",
        "entity_type.eq.employee",
        "action_type.ilike.%employee%",
      ].join(","),
    );
  }

  if (subSection === "districts") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.districts",
        "entity_type.eq.district",
        "action_type.ilike.%district%",
      ].join(","),
    );
  }

  if (subSection === "requests") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.requests",
        "entity_type.eq.specialist_contact_request",
        "actor_role.eq.resident_request",
      ].join(","),
    );
  }

  if (subSection === "house_settings") {
    return query.or(
      [
        "metadata->>subSectionKey.eq.house_settings",
        "entity_type.eq.house",
        "action_type.ilike.%house%",
      ].join(","),
    );
  }

  return query.filter("metadata->>subSectionKey", "eq", subSection);
}

function applyFilters(
  query: HistoryQueryLike,
  params: Required<
    Pick<
      GetPlatformChangeHistoryParams,
      | "tab"
      | "sort"
      | "actor"
      | "mainSection"
      | "subSection"
      | "districtHouseIds"
      | "houseId"
      | "dateFrom"
      | "dateTo"
    >
  >,
) {
  const retentionStart = getRetentionStart(params.tab);
  query = query.gte("created_at", retentionStart);

  if (params.tab === "cms") {
    query = query.filter("metadata->>sourceType", "eq", "cms");
  }

  if (params.tab === "incoming") {
    query = applyIncomingSourceFilter(query);
  }

  const parsedDateFrom = parseIsoDate(params.dateFrom);
  const parsedDateTo = parseIsoDate(params.dateTo, true);

  if (parsedDateFrom) {
    query = query.gte("created_at", parsedDateFrom);
  }

  if (parsedDateTo) {
    query = query.lte("created_at", parsedDateTo);
  }

  if (params.actor && params.tab === "cms") {
    query = query.eq("actor_name", params.actor);
  }

  if (params.mainSection && params.tab === "cms") {
    query = applyCmsMainSectionFilter(query, params.mainSection);
  }

  if (params.subSection) {
    query = applySubSectionFilter(query, params.subSection);
  }

  if (params.houseId && params.tab === "incoming") {
    query = query.filter("metadata->>houseId", "eq", params.houseId);
  } else if (params.districtHouseIds.length > 0 && params.tab === "incoming") {
    const expression = params.districtHouseIds
      .map((id) => `metadata->>houseId.eq.${id}`)
      .join(",");

    query = query.or(expression);
  }

  query =
    params.sort === "date_asc"
      ? query.order("created_at", { ascending: true })
      : query.order("created_at", { ascending: false });

  return query;
}

function normalizeMainSectionKey(params: {
  rawMainSectionKey?: string | null;
  entityType?: string | null;
  actionType?: string | null;
  sourceType?: string | null;
}) {
  const { rawMainSectionKey, entityType, actionType, sourceType } = params;

  if (sourceType === "house_portal") {
    return "houses";
  }

  if (rawMainSectionKey === "districts") return "districts";
  if (rawMainSectionKey === "houses") return "houses";
  if (rawMainSectionKey === "apartments") return "apartments";
  if (rawMainSectionKey === "employees") return "employees";
  if (rawMainSectionKey === "company") return "company";

  if (
    rawMainSectionKey === "settings" ||
    entityType === "district" ||
    actionType?.includes("district")
  ) {
    return "districts";
  }

  if (
    rawMainSectionKey === "house_portal" ||
    entityType === "house" ||
    entityType === "house_section" ||
    entityType === "house_document" ||
    entityType === "specialist" ||
    entityType === "specialist_contact_request" ||
    entityType === "house_access_session"
  ) {
    return "houses";
  }

  if (entityType === "apartment" || actionType?.includes("apartment")) {
    return "apartments";
  }

  if (
    rawMainSectionKey === "system" &&
    (entityType === "employee" || actionType?.includes("employee"))
  ) {
    return "employees";
  }

  if (entityType === "employee" || actionType?.includes("employee")) {
    return "employees";
  }

  return inferMainSectionKey({
    entityType,
    sourceType,
  });
}

function normalizeSubSectionKey(params: {
  rawSubSectionKey?: string | null;
  entityType?: string | null;
  actionType?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { rawSubSectionKey, entityType, actionType, metadata } = params;

  if (rawSubSectionKey === "faq" || rawSubSectionKey === "documents") {
    return "information";
  }

  if (rawSubSectionKey) {
    return rawSubSectionKey;
  }

  return inferSubSectionKey({
    entityType,
    actionType,
    metadata,
  });
}

function mapHistoryItem(row: HistoryRowLike): PlatformChangeHistoryItem {
  const metadata: Record<string, unknown> =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};

  const sourceType =
    typeof metadata.sourceType === "string"
      ? metadata.sourceType
      : row.actor_role === "resident_request" || row.actor_role === "resident"
        ? "house_portal"
        : "cms";

  const rawMainSectionKey =
    typeof metadata.mainSectionKey === "string" ? metadata.mainSectionKey : null;

  const mainSectionKey = normalizeMainSectionKey({
    rawMainSectionKey,
    entityType: row.entity_type,
    actionType: row.action_type,
    sourceType,
  });

  const rawSubSectionKey =
    typeof metadata.subSectionKey === "string" ? metadata.subSectionKey : null;

  const subSectionKey = normalizeSubSectionKey({
    rawSubSectionKey,
    entityType: row.entity_type,
    actionType: row.action_type,
    metadata,
  });

  return {
    id: row.id,
    created_at: row.created_at,
    actor_admin_id: row.actor_admin_id,
    actor_name: row.actor_name,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_label: row.entity_label,
    action_type: row.action_type,
    action_label: getActionLabel(row.action_type),
    description: row.description,
    source_type: sourceType === "house_portal" ? "house_portal" : "cms",
    main_section_key: mainSectionKey,
    main_section_label:
      typeof metadata.mainSectionLabel === "string" &&
      rawMainSectionKey !== "settings" &&
      rawMainSectionKey !== "house_portal" &&
      rawMainSectionKey !== "system"
        ? metadata.mainSectionLabel
        : getMainSectionLabel(mainSectionKey),
    sub_section_key: subSectionKey,
    sub_section_label:
      typeof metadata.subSectionLabel === "string" &&
      rawSubSectionKey !== "faq" &&
      rawSubSectionKey !== "documents"
        ? metadata.subSectionLabel
        : getSubSectionLabel(subSectionKey),
    house_id: typeof metadata.houseId === "string" ? metadata.houseId : null,
    house_slug:
      typeof metadata.houseSlug === "string" ? metadata.houseSlug : null,
    house_name:
      typeof metadata.houseName === "string" ? metadata.houseName : null,
    metadata,
  };
}

export async function getPlatformChangeHistory({
  tab = "all",
  page = 1,
  pageSize = 25,
  sort = "date_desc",
  actor = "",
  mainSection = "",
  subSection = "",
  districtHouseIds = [],
  houseId = "",
  dateFrom = "",
  dateTo = "",
}: GetPlatformChangeHistoryParams): Promise<PlatformChangeHistoryResult> {
  noStore();

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 50)
      : 25;

  const supabase = await createSupabaseServerClient();

  const normalizedParams = {
    tab,
    sort,
    actor: actor.trim(),
    mainSection: mainSection.trim(),
    subSection: subSection.trim(),
    districtHouseIds,
    houseId: houseId.trim(),
    dateFrom: dateFrom.trim(),
    dateTo: dateTo.trim(),
  };

  let countQuery = supabase
    .from("platform_change_history")
    .select("id", { count: "exact", head: true });

  countQuery = applyFilters(
    countQuery as unknown as HistoryQueryLike,
    normalizedParams,
  ) as unknown as typeof countQuery;

  const { count, error: countError } = await countQuery;

  if (countError) {
    const message = countError.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {
        items: [],
        totalCount: 0,
        totalPages: 1,
        page: 1,
        pageSize: safePageSize,
      };
    }

    throw new Error(`Failed to count platform history: ${countError.message}`);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const boundedPage = Math.min(safePage, totalPages);
  const from = (boundedPage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let dataQuery = supabase
    .from("platform_change_history")
    .select(
      [
        "id",
        "created_at",
        "actor_admin_id",
        "actor_name",
        "actor_email",
        "actor_role",
        "entity_type",
        "entity_id",
        "entity_label",
        "action_type",
        "description",
        "metadata",
      ].join(", "),
    );

  dataQuery = (
    applyFilters(
      dataQuery as unknown as HistoryQueryLike,
      normalizedParams,
    ).range(from, to) as unknown
  ) as typeof dataQuery;

  const { data, error } = await dataQuery;

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {
        items: [],
        totalCount: 0,
        totalPages: 1,
        page: 1,
        pageSize: safePageSize,
      };
    }

    throw new Error(`Failed to load platform history: ${error.message}`);
  }

  return {
    items: ((data ?? []) as unknown as HistoryRowLike[]).map(mapHistoryItem),
    totalCount,
    totalPages,
    page: boundedPage,
    pageSize: safePageSize,
  };
}
