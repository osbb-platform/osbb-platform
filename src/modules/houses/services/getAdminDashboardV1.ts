import { getPlatformChangeHistory } from "@/src/modules/history/services/getPlatformChangeHistory";
import {
  getAdminActiveApartmentCountsByHouseIds,
  getAdminHousePagesByHouseIds,
} from "@/src/modules/houses/services/getAdminDashboardBatchData";
import { getAdminHouses } from "@/src/modules/houses/services/getAdminHouses";

export type AdminDashboardKpi = {
  totalHouses: number;
  housesWithDrafts: number;
  housesWithoutApartments: number;
  draftsForReview: number;
  recentPublications7d: number;
};

export type AdminDashboardLinkItem = {
  id: string;
  houseId: string;
  houseName: string;
  section: string;
  title: string;
  href: string;
  updatedAt: string | null;
};

export type AdminDashboardPublicationItem = {
  id: string;
  houseId: string | null;
  houseName: string;
  section: string;
  title: string;
  createdAt: string;
  actionLabel: string;
  summary: string;
};

export type AdminDashboardHouseHealthItem = {
  houseId: string;
  houseName: string;
  hasDrafts: boolean;
  hasApartments: boolean;
  href: string;
};

export type AdminDashboardContentPipeline = {
  totalDraftSections: number;
  totalPublishedSections: number;
  housesWithDrafts: number;
  housesWithPublishedContent: number;
};

export type AdminDashboardV1 = {
  kpi: AdminDashboardKpi;
  topAlert: AdminDashboardLinkItem | null;
  reviewQueue: AdminDashboardLinkItem[];
  publications: AdminDashboardPublicationItem[];
  problematicHouses: AdminDashboardHouseHealthItem[];
  apartmentSetup: AdminDashboardHouseHealthItem[];
  contentPipeline: AdminDashboardContentPipeline;
  quickLinks: AdminDashboardLinkItem[];
};

type HouseAggregationRow = {
  houseId: string;
  houseName: string;
  houseSlug: string;
  hasDrafts: boolean;
  hasApartments: boolean;
  draftItems: AdminDashboardLinkItem[];
  draftPageCount: number;
  publishedPageCount: number;
};

const MAX_FEED_ITEMS = 10;

function getHouseBlockHref(houseId: string, block?: string) {
  const safeBlock = block?.trim();

  if (!safeBlock || safeBlock === "home") {
    return `/admin/houses/${houseId}`;
  }

  return `/admin/houses/${houseId}?block=${safeBlock}`;
}


function isRecent7d(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const diff = Date.now() - timestamp;
  return diff <= 7 * 24 * 60 * 60 * 1000;
}


function getItemTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function getAdminDashboardV1(): Promise<AdminDashboardV1> {
  const houses = (await getAdminHouses()).filter(
    (house) => house.is_active && !house.archived_at,
  );

  const houseIds = houses.map((house) => house.id);

  const [pages, apartmentCounts, history] = await Promise.all([
    getAdminHousePagesByHouseIds(houseIds),
    getAdminActiveApartmentCountsByHouseIds(houseIds),
    getPlatformChangeHistory({
      tab: "cms",
      pageSize: 50,
      sort: "date_desc",
    }),
  ]);

  const pagesByHouseId = new Map<string, typeof pages>();

  for (const page of pages) {
    const bucket = pagesByHouseId.get(page.house_id) ?? [];
    bucket.push(page);
    pagesByHouseId.set(page.house_id, bucket);
  }

  const houseRows = houses.map((house): HouseAggregationRow => {
    const housePages = pagesByHouseId.get(house.id) ?? [];

    let hasDrafts = false;
    let draftPageCount = 0;
    let publishedPageCount = 0;
    const draftItems: AdminDashboardLinkItem[] = [];

    for (const page of housePages) {
      if (page.status === "draft") {
        hasDrafts = true;
        draftPageCount += 1;

        draftItems.push({
          id: page.id,
          houseId: house.id,
          houseName: house.name,
          section: page.slug,
          title: page.title,
          href: getHouseBlockHref(house.id, page.slug),
          updatedAt: page.updated_at ?? page.created_at,
        });
      }

      if (page.status === "published") {
        publishedPageCount += 1;
      }
    }

    return {
      houseId: house.id,
      houseName: house.name,
      houseSlug: house.slug,
      hasDrafts,
      hasApartments: (apartmentCounts.get(house.id) ?? 0) > 0,
      draftItems,
      draftPageCount,
      publishedPageCount,
    };
  });

  const houseNameById = new Map(
    houseRows.map((row) => [row.houseId, row.houseName]),
  );

  const publications = history.items
    .filter(
      (item) =>
        item.house_id &&
        isRecent7d(item.created_at) &&
        (
          item.action_type.includes("publish") ||
          item.action_type.includes("confirm") ||
          item.action_type.includes("update_house_section")
        ),
    )
    .slice(0, MAX_FEED_ITEMS)
    .map((item) => ({
      id: item.id,
      houseId: item.house_id,
      houseName:
        item.house_name ??
        houseNameById.get(item.house_id ?? "") ??
        "Будинок",
      section: item.sub_section_label,
      actionLabel: item.action_type.includes("confirm")
        ? "Підтверджено"
        : item.action_type.includes("update")
          ? "Оновлено"
          : "Опубліковано",
      summary: `У розділі ${item.sub_section_label} опубліковано зміни`,
      title: item.entity_label ?? item.description,
      createdAt: item.created_at,
    }));

  const reviewQueue = houseRows
    .flatMap((row) => row.draftItems)
    .sort(
      (a, b) =>
        getItemTimestamp(b.updatedAt) -
        getItemTimestamp(a.updatedAt),
    );

  const topAlert = reviewQueue[0] ?? null;

  const problematicHouses = houseRows
    .filter((row) => row.hasDrafts || !row.hasApartments)
    .slice(0, MAX_FEED_ITEMS)
    .map((row) => ({
      houseId: row.houseId,
      houseName: row.houseName,
      hasDrafts: row.hasDrafts,
      hasApartments: row.hasApartments,
      href: row.hasDrafts
        ? row.draftItems[0]?.href ?? getHouseBlockHref(row.houseId)
        : `${getHouseBlockHref(row.houseId)}#apartments`,
    }));

  const apartmentSetup = houseRows
    .filter((row) => !row.hasApartments)
    .slice(0, MAX_FEED_ITEMS)
    .map((row) => ({
      houseId: row.houseId,
      houseName: row.houseName,
      hasDrafts: row.hasDrafts,
      hasApartments: false,
      href: `${getHouseBlockHref(row.houseId)}#apartments`,
    }));

  const totalDraftSections = houseRows.reduce(
    (sum, row) => sum + row.draftPageCount,
    0,
  );

  const totalPublishedSections = houseRows.reduce(
    (sum, row) => sum + row.publishedPageCount,
    0,
  );

  return {
    kpi: {
      totalHouses: houseRows.length,
      housesWithDrafts: houseRows.filter((row) => row.hasDrafts).length,
      housesWithoutApartments: houseRows.filter((row) => !row.hasApartments)
        .length,
      draftsForReview: reviewQueue.length,
      recentPublications7d: publications.length,
    },
    topAlert,
    reviewQueue,
    publications,
    problematicHouses,
    apartmentSetup,
    contentPipeline: {
      totalDraftSections,
      totalPublishedSections,
      housesWithDrafts: houseRows.filter((row) => row.hasDrafts).length,
      housesWithPublishedContent: houseRows.filter(
        (row) => row.publishedPageCount > 0,
      ).length,
    },
    quickLinks: [
      ...reviewQueue,
      ...problematicHouses.map((row) => ({
        id: row.houseId,
        houseId: row.houseId,
        houseName: row.houseName,
        section: row.hasDrafts ? "draft" : "apartments",
        title: row.hasDrafts
          ? "Є чернетки"
          : "Потрібно налаштувати квартири",
        href: row.href,
        updatedAt: null,
      })),
    ].slice(0, MAX_FEED_ITEMS),
  };
}
