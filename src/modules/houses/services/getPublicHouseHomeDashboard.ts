import { houseSystemCopy } from "@/src/shared/publicCopy/house";
import { getPublishedHouseHero } from "@/src/modules/houses/services/getPublishedHouseHero";
import { getPublishedHouseHomeWidgets } from "@/src/modules/houses/services/getPublishedHouseHomeWidgets";
import { getPublishedHousePlan } from "@/src/modules/houses/services/getPublishedHousePlan";
import { getPublishedHouseDebtors } from "@/src/modules/houses/services/getPublishedHouseDebtors";
import { getPublishedHouseMeetings } from "@/src/modules/houses/services/getPublishedHouseMeetings";
import { getPublishedHouseAnnouncements } from "@/src/modules/houses/services/getPublishedHouseAnnouncements";
import { getPublishedHouseInformationPosts } from "@/src/modules/houses/services/getPublishedHouseInformationPosts";
import type { HouseRecord } from "@/src/shared/types/entities/house.types";
import type { PublishedHouseAnnouncement } from "@/src/modules/houses/services/getPublishedHouseAnnouncements";
import type { HouseInformationPostSnapshot } from "@/src/modules/houses/services/getAdminHouseInformationPosts";

type HomeWidgetKind = "announcements" | "plan" | "meetings" | "debtors";

type HomeWidgetBase = {
  kind: HomeWidgetKind;
  title: string;
  href: string;
  ctaLabel: typeof houseSystemCopy.cta.open;
  isPlaceholder: boolean;
  badge: string | null;
  freshnessLabel: string | null;
  headline: string;
  description: string;
  meta: string[];
};

export type PublicHouseHomeStatusItem = {
  id: string;
  label: string;
  value: string;
};

export type PublicHouseHomeAlert = {
  source: "information" | "meetings";
  title: string;
  description: string;
  href: string;
  badge: string | null;
  publishedAt: string | null;
} | null;

export type PublicHouseHomeWidget = HomeWidgetBase;

export type PublicHouseHomeDashboard = {
  heroContent: {
    headline: string;
    subheadline: string;
  };
  statusStrip: PublicHouseHomeStatusItem[];
  topAlert: PublicHouseHomeAlert;
  widgets: PublicHouseHomeWidget[];
};

type AnnouncementLevel = "danger" | "warning" | "info";
type PlanTaskStatus = "draft" | "planned" | "in_progress" | "completed" | "archived";
type PlanTaskPriority = "high" | "medium" | "low";
type PlanTaskDateMode = "deadline" | "range";
type PlanTask = {
  id: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dateMode: PlanTaskDateMode;
  deadlineAt: string | null;
  startDate: string | null;
  endDate: string | null;
  contractor: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};



type GetPublicHouseHomeDashboardParams = {
  house: HouseRecord;
};

const CTA_LABEL = houseSystemCopy.cta.open;

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAnnouncementLevel(value: unknown): AnnouncementLevel {
  return value === "danger" || value === "warning" || value === "info"
    ? value
    : "info";
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTime(value: unknown) {
  return parseDate(value)?.getTime() ?? 0;
}


function formatDate(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return houseSystemCopy.date.unknown;
  }

  return date.toLocaleDateString(houseSystemCopy.date.locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return houseSystemCopy.date.unknown;
  }

  return date.toLocaleString(houseSystemCopy.date.locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelativeFreshnessLabel(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return null;
  }

  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;

  if (diff <= 7 * day) {
    return houseSystemCopy.freshness.new;
  }

  return null;
}

function truncateText(value: unknown, maxLength: number) {
  const text = asString(value);

  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}…`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(houseSystemCopy.date.locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatWidgetValue(value: unknown) {
  const raw = asString(value);
  if (!raw) {
    return "";
  }

  const normalized = Number(raw.replace(/\s+/g, "").replace(",", "."));
  if (Number.isFinite(normalized)) {
    return `${formatCurrency(normalized)} ₴`;
  }

  return raw.includes("₴") ? raw : raw;
}

function normalizeAmount(value: unknown) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}


function getPriorityOrder(priority: PlanTaskPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function getRelevantPlanDateTimestamp(task: PlanTask) {
  if (task.dateMode === "deadline") {
    return getTimestamp(task.deadlineAt);
  }

  return getTimestamp(task.startDate ?? task.endDate ?? null);
}

function sortPlanTasks(tasks: PlanTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.dateMode !== right.dateMode) {
      return left.dateMode === "deadline" ? -1 : 1;
    }

    const priorityDiff =
      getPriorityOrder(left.priority) - getPriorityOrder(right.priority);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dateDiff =
      getRelevantPlanDateTimestamp(left) - getRelevantPlanDateTimestamp(right);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return getTime(right.updatedAt) - getTime(left.updatedAt);
  });
}



function buildAnnouncementsWidget(
  slug: string,
  announcements: PublishedHouseAnnouncement[],
): PublicHouseHomeWidget {
  const href = "/announcements";

  const sortedAnnouncements = [...announcements].sort((left, right) => {
    return (
      Math.max(getTime(right.published_at), getTime(right.updated_at)) -
      Math.max(getTime(left.published_at), getTime(left.updated_at))
    );
  });

  if (sortedAnnouncements.length === 0) {
    return {
      kind: "announcements",
      title: houseSystemCopy.homeDashboard.announcements.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.announcements.placeholderDescription,
      meta: [],
    };
  }

  const pinnedAnnouncement =
    sortedAnnouncements.find((announcement) => announcement.is_pinned) ?? null;

  const featured = pinnedAnnouncement ?? sortedAnnouncements[0];
  const level = normalizeAnnouncementLevel(featured.level);

  const levelLabel =
    level === "danger"
      ? houseSystemCopy.homeDashboard.common.important
      : level === "warning"
        ? houseSystemCopy.homeDashboard.announcements.warning
        : houseSystemCopy.homeDashboard.announcements.normal;

  return {
    kind: "announcements",
    title: houseSystemCopy.homeDashboard.announcements.title,
    href,
    ctaLabel: CTA_LABEL,
    isPlaceholder: false,
    badge: levelLabel,
    freshnessLabel: getRelativeFreshnessLabel(featured.published_at),
    headline: featured.title || houseSystemCopy.homeDashboard.common.announcement,
    description:
      truncateText(featured.body, 140) ||
      houseSystemCopy.homeDashboard.announcements.fallbackDescription,
    meta: [
      `${houseSystemCopy.homeDashboard.announcements.published}: ${formatDate(featured.published_at)}`,
      `${houseSystemCopy.homeDashboard.announcements.totalPublished}: ${sortedAnnouncements.length}`,
    ],
  };
}

function buildPlanWidget(
  slug: string,
  tasks: PlanTask[],
): PublicHouseHomeWidget {
  const href = "/plan";

  if (tasks.length === 0) {
    return {
      kind: "plan",
      title: houseSystemCopy.homeDashboard.plan.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.plan.placeholderDescription,
      meta: [],
    };
  }
  const inProgress = sortPlanTasks(tasks.filter((task) => task.status === "in_progress"));
  const planned = sortPlanTasks(tasks.filter((task) => task.status === "planned"));
  const candidateWithDeadline = sortPlanTasks(
    tasks.filter((task) => task.status === "in_progress" || task.status === "planned"),
  )[0] ?? null;

  const latestUpdatedTask =
    [...tasks].sort((left, right) => getTime(right.updatedAt) - getTime(left.updatedAt))[0] ?? null;

  const featuredTask = candidateWithDeadline ?? latestUpdatedTask;

  if (!featuredTask) {
    return {
      kind: "plan",
      title: houseSystemCopy.homeDashboard.plan.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.plan.placeholderPublished,
      meta: [],
    };
  }

  const hasInProgress = inProgress.length > 0;
  const headline = hasInProgress
    ? houseSystemCopy.homeDashboard.plan.currentWorks
    : houseSystemCopy.homeDashboard.plan.upcomingPlans;
  const primaryDate =
    featuredTask.dateMode === "deadline"
      ? featuredTask.deadlineAt
      : featuredTask.startDate ?? featuredTask.endDate;

  return {
    kind: "plan",
    title: houseSystemCopy.homeDashboard.plan.title,
    href,
    ctaLabel: CTA_LABEL,
    isPlaceholder: false,
    badge: hasInProgress
      ? `${inProgress.length} ${houseSystemCopy.homeDashboard.plan.inProgressSuffix}`
      : `${planned.length} ${houseSystemCopy.homeDashboard.plan.plannedSuffix}`,
    freshnessLabel: null,
    headline,
    description:
      truncateText(featuredTask.title, 120) ||
      houseSystemCopy.homeDashboard.plan.fallbackDescription,
    meta: [
      primaryDate
        ? `${houseSystemCopy.homeDashboard.plan.nearestDate}: ${formatDate(primaryDate)}`
        : `${houseSystemCopy.homeDashboard.plan.updated}: ${formatDate(featuredTask.updatedAt)}`,
      `${houseSystemCopy.homeDashboard.plan.tasksInProgress}: ${inProgress.length}`,
    ],
  };
}

function buildMeetingsWidget(
  slug: string,
  meetings: Array<{
    id: string;
    title: string;
    shortDescription: string;
    meetingDateTime: string;
    status: string;
    updatedAt: string;
  }>,
): PublicHouseHomeWidget {
  const href = "/meetings";
  const items = meetings.filter((item) => item.status !== "draft");

  if (items.length === 0) {
    return {
      kind: "meetings",
      title: houseSystemCopy.homeDashboard.meetings.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.meetings.placeholderDescription,
      meta: [],
    };
  }

  const activeMeeting = items.find((item) => item.status == "active") ?? null;
  const reviewMeeting = items.find((item) => item.status == "review") ?? null;
  const completedMeeting = items.find((item) => item.status == "completed") ?? null;
  const archivedMeeting = items.find((item) => item.status == "archived") ?? null;

  const nearestScheduled =
    [...items]
      .filter((item) => item.status === "scheduled")
      .sort(
        (left, right) =>
          getTime(left.meetingDateTime) - getTime(right.meetingDateTime),
      )[0] ?? null;

  const featuredMeeting =
    activeMeeting ??
    reviewMeeting ??
    completedMeeting ??
    nearestScheduled ??
    archivedMeeting;

  if (!featuredMeeting) {
    return {
      kind: "meetings",
      title: houseSystemCopy.homeDashboard.meetings.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.meetings.placeholderDescription,
      meta: [],
    };
  }

  const badge =
    featuredMeeting.status === "active"
      ? houseSystemCopy.homeDashboard.common.voting
      : featuredMeeting.status === "review"
        ? houseSystemCopy.homeDashboard.common.review
        : featuredMeeting.status === "completed"
          ? houseSystemCopy.homeDashboard.common.decision
          : featuredMeeting.status === "archived"
            ? houseSystemCopy.homeDashboard.common.meetingsArchive
            : houseSystemCopy.homeDashboard.common.nearestMeeting;

  return {
    kind: "meetings",
    title: houseSystemCopy.homeDashboard.meetings.title,
    href,
    ctaLabel: CTA_LABEL,
    isPlaceholder: false,
    badge,
    freshnessLabel: getRelativeFreshnessLabel(featuredMeeting.meetingDateTime),
    headline: asString(featuredMeeting.title) || houseSystemCopy.homeDashboard.meetings.meeting,
    description:
      truncateText(featuredMeeting.shortDescription, 140) ||
      houseSystemCopy.homeDashboard.meetings.fallbackDescription,
    meta: [
      `${houseSystemCopy.homeDashboard.meetings.date}: ${formatDateTime(featuredMeeting.meetingDateTime)}`,
      nearestScheduled && nearestScheduled.id != featuredMeeting.id
        ? `${houseSystemCopy.homeDashboard.meetings.nextMeeting}: ${formatDateTime(nearestScheduled.meetingDateTime)}`
        : `${houseSystemCopy.homeDashboard.meetings.status}: ${badge}`,
    ],
  };
}

function buildDebtorsWidget(
  slug: string,
  debtors: {
    updatedAt: string | null;
    activeItems: Array<{
      amount: string;
    }>;
  } | null,
): PublicHouseHomeWidget {
  const href = "/debtors";

  const hasPublishedSnapshot = Boolean(
    debtors && debtors.updatedAt && debtors.activeItems.length > 0,
  );

  if (!hasPublishedSnapshot || !debtors) {
    return {
      kind: "debtors",
      title: houseSystemCopy.homeDashboard.debtors.title,
      href,
      ctaLabel: CTA_LABEL,
      isPlaceholder: true,
      badge: null,
      freshnessLabel: null,
      headline: houseSystemCopy.homeDashboard.common.comingSoon,
      description: houseSystemCopy.homeDashboard.debtors.placeholderDescription,
      meta: [],
    };
  }

  const items = debtors.activeItems;
  const totalDebt = items.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);

  return {
    kind: "debtors",
    title: houseSystemCopy.homeDashboard.debtors.title,
    href,
    ctaLabel: CTA_LABEL,
    isPlaceholder: false,
    badge: houseSystemCopy.homeDashboard.common.paymentStatus,
    freshnessLabel: null,
    headline:
      items.length > 0
        ? `${items.length} ${items.length === 1 ? houseSystemCopy.homeDashboard.debtors.debtorOne : houseSystemCopy.homeDashboard.debtors.debtorMany}`
        : houseSystemCopy.homeDashboard.debtors.noDebts,
    description:
      items.length > 0
        ? `${houseSystemCopy.homeDashboard.debtors.totalDebt}: ${formatCurrency(totalDebt)} ₴`
        : houseSystemCopy.homeDashboard.debtors.noDebtsDescription,
    meta: [`${houseSystemCopy.homeDashboard.debtors.actualDate}: ${formatDate(debtors.updatedAt)}`],
  };
}

function pickTopAlert(
  slug: string,
  informationPosts: HouseInformationPostSnapshot[],
  meetings: Array<{
    title: string;
    shortDescription: string;
    meetingDateTime: string;
    status: string;
  }>,
): PublicHouseHomeAlert {
  const informationCandidates = informationPosts
    .map((post) => {
      const content = post.content;

      return {
        source: "information" as const,
        priority: content.isPinned ? 3 : 1,
        title:
          content.headline ||
          post.title ||
          houseSystemCopy.homeDashboard.common.importantInfo,
        description:
          asString(content.body) ||
          houseSystemCopy.homeDashboard.common.openInfoSection,
        href: "/information",
        badge: content.isPinned ? houseSystemCopy.homeDashboard.common.important : null,
        publishedAt: content.publishedAt || content.updatedAt || null,
        isExpired: false,
      };
    })
    .filter((item) => !item.isExpired);

  const meetingCandidates = meetings
    .filter((item) => item.status === "active")
    .map((item) => ({
      source: "meetings" as const,
      priority: 3,
      title: asString(item.title) || houseSystemCopy.homeDashboard.common.activeVoting,
      description:
        truncateText(item.shortDescription, 180) ||
        houseSystemCopy.homeDashboard.common.activeVotingDescription,
      href: "/meetings?mode=active",
      badge: houseSystemCopy.homeDashboard.common.voting,
      publishedAt: asString(item.meetingDateTime) || null,
      isExpired: false,
    }));

  const candidates = [...informationCandidates, ...meetingCandidates].sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return getTime(right.publishedAt) - getTime(left.publishedAt);
  });

  const winner = candidates[0];

  if (!winner) {
    return null;
  }

  return {
    source: winner.source,
    title: winner.title,
    description: winner.description,
    href: winner.href,
    badge: winner.badge,
    publishedAt: winner.publishedAt,
  };
}

function buildFallbackPublicHouseHomeDashboard(
  house: HouseRecord,
): PublicHouseHomeDashboard {
  const slug = house.slug;

  return {
    heroContent: {
      headline: houseSystemCopy.homeDashboard.hero.headlineFallback,
      subheadline: houseSystemCopy.homeDashboard.hero.subheadlineFallback,
    },
    statusStrip: [],
    topAlert: null,
    widgets: [
      buildAnnouncementsWidget(slug, []),
      buildPlanWidget(slug, []),
      buildMeetingsWidget(slug, []),
      buildDebtorsWidget(slug, {
        updatedAt: null,
        activeItems: [],
      }),
    ],
  };
}

export async function getPublicHouseHomeDashboard({
  house,
}: GetPublicHouseHomeDashboardParams): Promise<PublicHouseHomeDashboard> {
  try {
  const houseId = house.id;
  const slug = house.slug;

  const [
    houseHero,
    housePlan,
    houseDebtors,
    houseMeetings,
    houseAnnouncements,
    informationPosts,
    homeWidgets,
  ] = await Promise.all([
    getPublishedHouseHero(houseId),
    getPublishedHousePlan(houseId),
    getPublishedHouseDebtors(houseId),
    getPublishedHouseMeetings(houseId),
    getPublishedHouseAnnouncements(houseId),
    getPublishedHouseInformationPosts(houseId),
    getPublishedHouseHomeWidgets(house.id),
  ]);

  const heroContent = {
    headline: houseHero?.headline ?? "",
    subheadline: houseHero?.subheadline ?? "",
  };

  const rawWidgets = homeWidgets?.statusWidgets ?? [];

  const statusWidgets: PublicHouseHomeStatusItem[] = rawWidgets
    .filter(
      (item): item is { id: string; label: string; value: string } =>
        Boolean(item) && typeof item === "object",
    )
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `widget-${index}`,
      label: String(item.label ?? "").slice(0, 30),
      value: formatWidgetValue(item.value),
    }))
    .filter((item) => item.label && item.value);


  return {
    heroContent: {
      headline:
        heroContent.headline || houseSystemCopy.homeDashboard.hero.headlineFallback,
      subheadline:
        heroContent.subheadline ||
        houseSystemCopy.homeDashboard.hero.subheadlineFallback,
    },
    statusStrip: statusWidgets,
    topAlert: pickTopAlert(slug, informationPosts, houseMeetings.items),
    widgets: [
      buildAnnouncementsWidget(slug, houseAnnouncements),
      buildPlanWidget(
        slug,
        housePlan.tasks.map((task) => ({
          id: task.id,
          title: task.content.title,
          description: task.content.description,
          status: task.content.taskStatus,
          priority: task.content.priority,
          dateMode: task.content.dateMode,
          deadlineAt: task.content.deadlineAt,
          startDate: task.content.startDate,
          endDate: task.content.endDate,
          contractor: task.content.contractor,
          images: [],
          documents: [],
          createdAt: task.content.createdAt,
          updatedAt: task.content.updatedAt,
          archivedAt: task.content.archivedAt,
          archiveYear: task.content.archiveYear,
        })),
      ),
      buildMeetingsWidget(slug, houseMeetings.items),
      buildDebtorsWidget(slug, houseDebtors),
    ],
  };

  } catch (error) {
    console.error("Failed to build public house home dashboard:", {
      houseId: house.id,
      slug: house.slug,
      error,
    });

    return buildFallbackPublicHouseHomeDashboard(house);
  }
}
