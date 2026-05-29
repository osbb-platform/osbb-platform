import { getHouseHomePageByHouseId } from "@/src/modules/houses/services/getHouseHomePageByHouseId";
import { getHouseInformationPageByHouseId } from "@/src/modules/houses/services/getHouseInformationPageByHouseId";
import { getPublishedHousePage } from "@/src/modules/houses/services/getPublishedHousePage";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";
import { getPublicHouseDocumentsFeed } from "@/src/modules/houses/services/getPublicHouseDocumentsFeed";
import { getPublishedHousePlan } from "@/src/modules/houses/services/getPublishedHousePlan";
import { getPublishedHouseDebtors } from "@/src/modules/houses/services/getPublishedHouseDebtors";

type BellSourceKind =
  | "announcements"
  | "information"
  | "meetings"
  | "plan"
  | "reports"
  | "documents"
  | "board"
  | "requisites"
  | "specialists"
  | "debtors";

export type PublicHouseBellItem = {
  id: string;
  section: string;
  text: string;
  date: string;
  timestamp: number;
  source: BellSourceKind;
};

export type PublicHouseBellFeed = {
  total: number;
  items: PublicHouseBellItem[];
};

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 10;

function toTimestamp(value: unknown): number {
  if (typeof value !== "string" || !value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isRecent(timestamp: number) {
  return timestamp > 0 && Date.now() - timestamp <= WINDOW_MS;
}

function formatDate(timestamp: number) {
  if (!timestamp) return "Нещодавно";

  return new Date(timestamp).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function extractContent(
  value: unknown,
): Record<string, unknown> {
  return typeof value === "object" && value
    ? (value as Record<string, unknown>)
    : {};
}


function getMeetingBellTimestamp(
  item: Record<string, unknown>,
): number {
  return Math.max(
    toTimestamp(item.updatedAt),
    toTimestamp(item.publishedAt),
    toTimestamp(item.createdAt),
  );
}


function getPlanBellTimestamp(
  item: Record<string, unknown>,
): number {
  return Math.max(
    toTimestamp(item.updatedAt),
    toTimestamp(item.archivedAt),
    toTimestamp(item.createdAt),
  );
}

function getSpecialistBellTimestamp(
  item: Record<string, unknown>,
): number {
  return Math.max(
    toTimestamp(item.updatedAt),
    toTimestamp(item.createdAt),
  );
}

export async function getPublicHouseBellFeed({
  houseId,
}: {
  houseId: string;
}): Promise<PublicHouseBellFeed> {
  const items: PublicHouseBellItem[] = [];

  const [homePage, informationPage, reportsPage] = await Promise.all([
    getHouseHomePageByHouseId(houseId),
    getHouseInformationPageByHouseId(houseId),
    getPublishedHousePage(houseId, "reports"),
  ]);

  const [homeSections, informationSections, reportSections, documents, housePlan, houseDebtors] =
    await Promise.all([
      homePage ? getPublishedHouseSections(homePage.id) : Promise.resolve([]),
      informationPage ? getPublishedHouseSections(informationPage.id) : Promise.resolve([]),
      reportsPage ? getPublishedHouseSections(reportsPage.id) : Promise.resolve([]),
      getPublicHouseDocumentsFeed(houseId),
      getPublishedHousePlan(houseId),
      getPublishedHouseDebtors(houseId),
    ]);

  for (const section of homeSections) {
    const content = extractContent(section.content);

    if (section.kind === "announcements") {
      const timestamp = Math.max(
        toTimestamp(content.updatedAt),
        toTimestamp(content.publishedAt),
        toTimestamp(content.createdAt),
      );

      if (isRecent(timestamp)) {
        items.push({
          id: section.id,
          section: "Оголошення",
          text: "Опубліковано нове оголошення",
          date: formatDate(timestamp),
          timestamp,
          source: "announcements",
        });
      }
    }

    if (section.kind === "meetings") {
      const meetingItems = Array.isArray(content.items)
        ? (content.items as Array<Record<string, unknown>>)
        : [];

      const recentMeetings = meetingItems.filter((item) =>
        isRecent(getMeetingBellTimestamp(item)),
      );

      if (recentMeetings.length > 0) {
        const latest = Math.max(
          ...recentMeetings.map((item) =>
            getMeetingBellTimestamp(item),
          ),
        );

        items.push({
          id: `${section.id}-meetings`,
          section: "Збори",
          text:
            recentMeetings.length === 1
              ? "Додано нові збори"
              : `Добавлено ${recentMeetings.length} новых собрания`,
          date: formatDate(latest),
          timestamp: latest,
          source: "meetings",
        });
      }
    }

    if (section.kind === "contacts") {
      const timestamp = Math.max(
        toTimestamp(content.updatedAt),
        toTimestamp(content.publishedAt),
      );

      if (isRecent(timestamp)) {
        items.push({
          id: `${section.id}-board`,
          section: "Правління",
          text: "Оновлено склад правління",
          date: formatDate(timestamp),
          timestamp,
          source: "board",
        });
      }
    }

    if (section.kind === "requisites") {
      const timestamp = Math.max(
        toTimestamp(content.updatedAt),
        toTimestamp(content.publishedAt),
      );

      if (isRecent(timestamp)) {
        items.push({
          id: `${section.id}-req`,
          section: "Реквізити",
          text: "Оновлено реквізити",
          date: formatDate(timestamp),
          timestamp,
          source: "requisites",
        });
      }
    }

    if (section.kind === "specialists") {
      const specialistItems = Array.isArray(content.specialists)
        ? (content.specialists as Array<Record<string, unknown>>)
        : [];

      const itemTimestamp =
        specialistItems.length > 0
          ? Math.max(...specialistItems.map(getSpecialistBellTimestamp))
          : 0;

      const timestamp = Math.max(
        itemTimestamp,
        toTimestamp(content.updatedAt),
        toTimestamp(content.publishedAt),
      );

      if (isRecent(timestamp)) {
        items.push({
          id: `${section.id}-spec`,
          section: "Спеціалісти",
          text: "Оновлено список спеціалістів",
          date: formatDate(timestamp),
          timestamp,
          source: "specialists",
        });
      }
    }

  }

  const debtorsTimestamp = toTimestamp(houseDebtors.updatedAt);

  if (houseDebtors.activeItems.length > 0 && isRecent(debtorsTimestamp)) {
    items.push({
      id: `${houseId}-debtors`,
      section: "Боржники",
      text: "Опубліковано новий список заборгованості",
      date: formatDate(debtorsTimestamp),
      timestamp: debtorsTimestamp,
      source: "debtors",
    });
  }

  const recentPlanTasks = housePlan.tasks.filter((task) =>
    isRecent(
      Math.max(
        toTimestamp(task.content.updatedAt),
        toTimestamp(task.content.archivedAt),
        toTimestamp(task.content.createdAt),
      ),
    ),
  );

  if (recentPlanTasks.length > 0) {
    const latest = Math.max(
      ...recentPlanTasks.map((task) =>
        Math.max(
          toTimestamp(task.content.updatedAt),
          toTimestamp(task.content.archivedAt),
          toTimestamp(task.content.createdAt),
        ),
      ),
    );

    items.push({
      id: `${houseId}-plan`,
      section: "План робіт",
      text:
        recentPlanTasks.length === 1
          ? "Додано нову задачу"
          : `Добавлено ${recentPlanTasks.length} новых задач`,
      date: formatDate(latest),
      timestamp: latest,
      source: "plan",
    });
  }

  for (const section of informationSections) {
    const content = extractContent(section.content);
    const timestamp = Math.max(
      toTimestamp(content.updatedAt),
      toTimestamp(content.publishedAt),
      toTimestamp(content.createdAt),
    );

    if (!isRecent(timestamp)) continue;

    items.push({
      id: section.id,
      section: "Інформація",
      text:
        section.kind === "faq"
          ? "Оновлено FAQ"
          : "Додано новий інформаційний матеріал",
      date: formatDate(timestamp),
      timestamp,
      source: "information",
    });
  }

  if (reportSections.length > 0) {
    const timestamps = reportSections
      .map((section) => {
        const content = extractContent(section.content);
        return Math.max(
          toTimestamp(content.updatedAt),
          toTimestamp(content.publishedAt),
          toTimestamp(content.createdAt),
        );
      })
      .filter(isRecent);

    if (timestamps.length > 0) {
      const latest = Math.max(...timestamps);

      items.push({
        id: "reports-feed",
        section: "Звіти",
        text:
          timestamps.length === 1
            ? "Додано новий звіт"
            : `Добавлено ${timestamps.length} новых отчетов`,
        date: formatDate(latest),
        timestamp: latest,
        source: "reports",
      });
    }
  }

  const recentDocuments = documents.filter((item) =>
    isRecent(toTimestamp(item.updated_at)),
  );

  if (recentDocuments.length > 0) {
    const latest = Math.max(
      ...recentDocuments.map((item) => toTimestamp(item.updated_at)),
    );

    items.push({
      id: "documents-feed",
      section: "Документи",
      text:
        recentDocuments.length === 1
          ? "Додано новий документ"
          : `Добавлено ${recentDocuments.length} новых документов`,
      date: formatDate(latest),
      timestamp: latest,
      source: "documents",
    });
  }

  const sorted = items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ITEMS);

  return {
    total: items.length,
    items: sorted,
  };
}
