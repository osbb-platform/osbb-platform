import { getPublishedHouseAnnouncements } from "@/src/modules/houses/services/getPublishedHouseAnnouncements";
import { getPublishedHouseInformationPosts } from "@/src/modules/houses/services/getPublishedHouseInformationPosts";
import { getPublishedHouseFaq } from "@/src/modules/houses/services/getPublishedHouseFaq";
import { getPublishedHouseReports } from "@/src/modules/houses/services/getPublishedHouseReports";
import { getPublishedHouseBoard } from "@/src/modules/houses/services/getPublishedHouseBoard";
import { getPublishedHouseRequisites } from "@/src/modules/houses/services/getPublishedHouseRequisites";
import { getPublishedHouseSpecialists } from "@/src/modules/houses/services/getPublishedHouseSpecialists";
import { getPublicHouseDocumentsFeed } from "@/src/modules/houses/services/getPublicHouseDocumentsFeed";
import { getPublishedHousePlan } from "@/src/modules/houses/services/getPublishedHousePlan";
import { getPublishedHouseDebtors } from "@/src/modules/houses/services/getPublishedHouseDebtors";
import { getPublishedHouseMeetings } from "@/src/modules/houses/services/getPublishedHouseMeetings";

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



function getMeetingBellTimestamp(item: {
  updatedAt?: string | null;
  meetingDateTime?: string | null;
}): number {
  return Math.max(
    toTimestamp(item.updatedAt),
    toTimestamp(item.meetingDateTime),
  );
}




export async function getPublicHouseBellFeed({
  houseId,
}: {
  houseId: string;
}): Promise<PublicHouseBellFeed> {
  try {
  const items: PublicHouseBellItem[] = [];

  const [
    announcements,
    informationPosts,
    faq,
    reportsData,
    board,
    requisites,
    specialistsData,
    documents,
    housePlan,
    houseDebtors,
    houseMeetings,
  ] = await Promise.all([
    getPublishedHouseAnnouncements(houseId),
    getPublishedHouseInformationPosts(houseId),
    getPublishedHouseFaq(houseId),
    getPublishedHouseReports(houseId),
    getPublishedHouseBoard(houseId),
    getPublishedHouseRequisites(houseId),
    getPublishedHouseSpecialists(houseId),
    getPublicHouseDocumentsFeed(houseId),
    getPublishedHousePlan(houseId),
    getPublishedHouseDebtors(houseId),
    getPublishedHouseMeetings(houseId),
  ]);

  const recentAnnouncements = announcements.filter((announcement) =>
    isRecent(Math.max(toTimestamp(announcement.updated_at), toTimestamp(announcement.published_at))),
  );

  if (recentAnnouncements.length > 0) {
    const latest = Math.max(
      ...recentAnnouncements.map((announcement) =>
        Math.max(toTimestamp(announcement.updated_at), toTimestamp(announcement.published_at)),
      ),
    );

    items.push({
      id: `${houseId}-announcements`,
      section: "Оголошення",
      text:
        recentAnnouncements.length === 1
          ? "Опубліковано нове оголошення"
          : `Добавлено ${recentAnnouncements.length} новых объявлений`,
      date: formatDate(latest),
      timestamp: latest,
      source: "announcements",
    });
  }

  const boardTimestamp = Math.max(
    ...board.members.map((member) => toTimestamp(member.updatedAt)),
    0,
  );

  if (board.members.length > 0 && isRecent(boardTimestamp)) {
    items.push({
      id: `${houseId}-board`,
      section: "Правління",
      text: "Оновлено склад правління",
      date: formatDate(boardTimestamp),
      timestamp: boardTimestamp,
      source: "board",
    });
  }

  const requisitesTimestamp = toTimestamp(requisites?.updatedAt);

  if (requisites && isRecent(requisitesTimestamp)) {
    items.push({
      id: `${houseId}-requisites`,
      section: "Реквізити",
      text: "Оновлено реквізити",
      date: formatDate(requisitesTimestamp),
      timestamp: requisitesTimestamp,
      source: "requisites",
    });
  }

  const specialistTimestamps = specialistsData.specialists.map((specialist) =>
    Math.max(
      toTimestamp(specialist.content.updatedAt),
      toTimestamp(specialist.content.publishedAt),
      toTimestamp(specialist.content.createdAt),
    ),
  );

  const specialistsTimestamp =
    specialistTimestamps.length > 0 ? Math.max(...specialistTimestamps) : 0;

  if (specialistsData.specialists.length > 0 && isRecent(specialistsTimestamp)) {
    items.push({
      id: `${houseId}-specialists`,
      section: "Спеціалісти",
      text: "Оновлено список спеціалістів",
      date: formatDate(specialistsTimestamp),
      timestamp: specialistsTimestamp,
      source: "specialists",
    });
  }

  const recentMeetings = houseMeetings.items.filter((item) =>
    isRecent(getMeetingBellTimestamp(item)),
  );

  if (recentMeetings.length > 0) {
    const latest = Math.max(
      ...recentMeetings.map((item) => getMeetingBellTimestamp(item)),
    );

    items.push({
      id: `${houseId}-meetings`,
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

  const informationTimestamps = [
    ...informationPosts.map((post) =>
      Math.max(
        toTimestamp(post.content.updatedAt),
        toTimestamp(post.content.publishedAt),
        toTimestamp(post.content.createdAt),
      ),
    ),
    faq ? Math.max(toTimestamp(faq.updatedAt), toTimestamp(faq.publishedAt)) : 0,
  ].filter(isRecent);

  if (informationTimestamps.length > 0) {
    const latest = Math.max(...informationTimestamps);

    items.push({
      id: "information-feed",
      section: "Інформація",
      text:
        informationTimestamps.length === 1
          ? "Додано новий інформаційний матеріал"
          : `Добавлено ${informationTimestamps.length} новых информационных материалов`,
      date: formatDate(latest),
      timestamp: latest,
      source: "information",
    });
  }

  const reportTimestamps = reportsData.reports
    .map((report) =>
      Math.max(
        toTimestamp(report.updatedAt),
        toTimestamp(report.publishedAt),
        toTimestamp(report.reportDate),
      ),
    )
    .filter(isRecent);

  if (reportTimestamps.length > 0) {
    const latest = Math.max(...reportTimestamps);

    items.push({
      id: "reports-feed",
      section: "Звіти",
      text:
        reportTimestamps.length === 1
          ? "Додано новий звіт"
          : `Добавлено ${reportTimestamps.length} новых отчетов`,
      date: formatDate(latest),
      timestamp: latest,
      source: "reports",
    });
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

  } catch (error) {
    console.error("Failed to build public house bell feed:", {
      houseId,
      error,
    });

    return {
      total: 0,
      items: [],
    };
  }
}
