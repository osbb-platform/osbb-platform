import { houseSystemCopy } from "@/src/shared/publicCopy/house";
import { ensureHouseHomePage } from "@/src/modules/houses/services/ensureHouseHomePage";
import { ensureHouseInformationPage } from "@/src/modules/houses/services/ensureHouseInformationPage";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import type { HouseSectionRecord } from "@/src/shared/types/entities/house.types";

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
type MeetingLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

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

type MeetingQuestion = {
  id: string;
  title: string;
  description: string;
  decisionDraft: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstained?: number;
  totalApartmentsVoted?: number;
  approvalOutcome: "approved" | "rejected" | "pending";
};

type MeetingItem = {
  id: string;
  title: string;
  shortDescription: string;
  meetingDateTime: string;
  location: string;
  status: MeetingLifecycleStatus;
  protocolPdf?: string;
  protocolDocumentId?: string;
  questions: MeetingQuestion[];
};

type DebtorItem = {
  apartmentId: string;
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: number | null;
  amount: string;
  days: string;
};

type GetPublicHouseHomeDashboardParams = {
  houseId: string;
  slug: string;
};

const CTA_LABEL = houseSystemCopy.cta.open;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
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

function getSortTimestamp(content: Record<string, unknown>) {
  return Math.max(
    getTime(content.publishedAt),
    getTime(content.updatedAt),
    getTime(content.createdAt),
  );
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

function normalizePlanTasks(value: unknown): PlanTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const now = new Date(Date.now() - index * 1000).toISOString();

      return {
        id: asString(raw.id) || `plan-${index}`,
        title: asString(raw.title),
        description: asString(raw.description),
        status:
          raw.status === "planned" ||
          raw.status === "in_progress" ||
          raw.status === "completed" ||
          raw.status === "archived"
            ? raw.status
            : "draft",
        priority:
          raw.priority === "high" ||
          raw.priority === "medium" ||
          raw.priority === "low"
            ? raw.priority
            : "medium",
        dateMode: raw.dateMode === "range" ? "range" : "deadline",
        deadlineAt: asString(raw.deadlineAt) || null,
        startDate: asString(raw.startDate) || null,
        endDate: asString(raw.endDate) || null,
        contractor: asString(raw.contractor) || null,
        createdAt: asString(raw.createdAt) || now,
        updatedAt: asString(raw.updatedAt) || now,
        archivedAt: asString(raw.archivedAt) || null,
      } satisfies PlanTask;
    })
    .filter((item): item is PlanTask => item !== null && Boolean(item.title));
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

function normalizeMeetings(value: unknown): MeetingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<MeetingItem[]>((acc, item, index) => {
    if (!item || typeof item !== "object") {
      return acc;
    }

    const raw = item as Record<string, unknown>;
    const normalized: MeetingItem = {
      id: asString(raw.id) || `meeting-${index}`,
      title: asString(raw.title),
      shortDescription: asString(raw.shortDescription),
      meetingDateTime: asString(raw.meetingDateTime),
      location: asString(raw.location),
      status:
        raw.status === "scheduled" ||
        raw.status === "active" ||
        raw.status === "review" ||
        raw.status === "completed" ||
        raw.status === "archived"
          ? raw.status
          : "draft",
      protocolPdf: asString(raw.protocolPdf) || undefined,
      protocolDocumentId: asString(raw.protocolDocumentId) || undefined,
      questions: Array.isArray(raw.questions)
        ? (raw.questions as MeetingQuestion[])
        : [],
    };

    if (!normalized.title) {
      return acc;
    }

    acc.push(normalized);
    return acc;
  }, []);
}

function normalizeDebtorItems(value: unknown): DebtorItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;

      return {
        apartmentId: asString(raw.apartmentId),
        apartmentLabel: asString(raw.apartmentLabel),
        accountNumber: asString(raw.accountNumber),
        ownerName: asString(raw.ownerName),
        area:
          typeof raw.area === "number" && Number.isFinite(raw.area)
            ? raw.area
            : null,
        amount: asString(raw.amount),
        days: asString(raw.days),
      } satisfies DebtorItem;
    })
    .filter((item): item is DebtorItem => Boolean(item?.apartmentId))
    .filter((item) => normalizeAmount(item.amount) > 0);
}

function buildAnnouncementsWidget(
  slug: string,
  sections: HouseSectionRecord[],
): PublicHouseHomeWidget {
  const href = `/house/${slug}/announcements`;

  const sortedSections = [...sections].sort((left, right) => {
    return getSortTimestamp(asRecord(right.content)) - getSortTimestamp(asRecord(left.content));
  });

  if (sortedSections.length === 0) {
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

  const importantAnnouncement =
    sortedSections.find((section) => {
      const content = asRecord(section.content);
      return normalizeAnnouncementLevel(content.level) === "danger";
    }) ?? null;

  const featured = importantAnnouncement ?? sortedSections[0];
  const content = asRecord(featured.content);
  const level = normalizeAnnouncementLevel(content.level);

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
    freshnessLabel: getRelativeFreshnessLabel(content.publishedAt),
    headline: asString(content.title) || featured.title || houseSystemCopy.homeDashboard.common.announcement,
    description:
      truncateText(content.body, 140) ||
      houseSystemCopy.homeDashboard.announcements.fallbackDescription,
    meta: [
      `${houseSystemCopy.homeDashboard.announcements.published}: ${formatDate(content.publishedAt)}`,
      `${houseSystemCopy.homeDashboard.announcements.totalPublished}: ${sortedSections.length}`,
    ],
  };
}

function buildPlanWidget(
  slug: string,
  sections: HouseSectionRecord[],
): PublicHouseHomeWidget {
  const href = `/house/${slug}/plan`;
  const planSection = sections[0];

  if (!planSection) {
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

  const content = asRecord(planSection.content);
  const tasks = normalizePlanTasks(content.items);
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
  sections: HouseSectionRecord[],
): PublicHouseHomeWidget {
  const href = `/house/${slug}/meetings`;
  const meetingsSection = sections[0];

  if (!meetingsSection) {
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

  const content = asRecord(meetingsSection.content);
  const items = normalizeMeetings(content.items).filter((item) => item.status !== "draft");

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
  sections: HouseSectionRecord[],
): PublicHouseHomeWidget {
  const href = `/house/${slug}/debtors`;
  const debtorsSection = sections[0];

  if (!debtorsSection) {
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

  const content = asRecord(debtorsSection.content);
  const hasPublishedSnapshot = Boolean(
    asString(content.updatedAt) || Array.isArray(content.activeItems),
  );
  const items = normalizeDebtorItems(content.activeItems);

  if (!hasPublishedSnapshot) {
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
    meta: [`${houseSystemCopy.homeDashboard.debtors.actualDate}: ${formatDate(content.updatedAt)}`],
  };
}

function pickTopAlert(
  slug: string,
  informationSections: HouseSectionRecord[],
  meetingsSections: HouseSectionRecord[],
): PublicHouseHomeAlert {
  const informationCandidates = informationSections
    .filter((section) => section.kind === "rich_text")
    .map((section) => {
      const content = asRecord(section.content);

      return {
        source: "information" as const,
        priority: normalizeAnnouncementLevel(content.level) === "danger" ? 3 : normalizeAnnouncementLevel(content.level) === "warning" ? 2 : 1,
        title: asString(content.headline) || section.title || houseSystemCopy.homeDashboard.common.importantInfo,
        description:
          truncateText(content.body, 180) ||
          houseSystemCopy.homeDashboard.common.openInfoSection,
        href: `/house/${slug}/information`,
        badge: asBoolean(content.isPinned) ? houseSystemCopy.homeDashboard.common.important : null,
        publishedAt: asString(content.publishedAt) || asString(content.updatedAt) || null,
        isExpired:
          parseDate(content.deadlineAt) !== null &&
          (parseDate(content.deadlineAt)?.getTime() ?? 0) < Date.now(),
      };
    })
    .filter((item) => !item.isExpired);

  const meetingCandidates = meetingsSections
    .flatMap((section) => {
      const items = normalizeMeetings(asRecord(section.content).items);

      return items
        .filter((item) => item.status === "active")
        .map((item) => ({
          source: "meetings" as const,
          priority: 3,
          title: asString(item.title) || houseSystemCopy.homeDashboard.common.activeVoting,
          description:
            truncateText(item.shortDescription, 180) ||
            houseSystemCopy.homeDashboard.common.activeVotingDescription,
          href: `/house/${slug}/meetings?mode=active`,
          badge: houseSystemCopy.homeDashboard.common.voting,
          publishedAt: asString(item.meetingDateTime) || null,
          isExpired: false,
        }));
    });

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

export async function getPublicHouseHomeDashboard({
  houseId,
  slug,
}: GetPublicHouseHomeDashboardParams): Promise<PublicHouseHomeDashboard> {
  const house = await getHouseBySlug(slug);
  const homePage = await ensureHouseHomePage({ houseId });
  const informationPage = await ensureHouseInformationPage({ houseId });

  const [homeSections, informationSections] = await Promise.all([
    getPublishedHouseSections(homePage.id),
    getPublishedHouseSections(informationPage.id),
  ]);

  const heroSection = homeSections.find((section) => section.kind === "hero");
  const heroContent = asRecord(heroSection?.content);

  const announcementsSections = homeSections.filter(
    (section) => section.kind === "announcements",
  );

  const planSections = homeSections.filter((section) => section.kind === "plan");
  const meetingsSections = homeSections.filter((section) => section.kind === "meetings");
  const debtorsSections = homeSections.filter((section) => section.kind === "debtors");
  const dashboardSection = homeSections.find(
    (section) => section.kind === "custom" && section.title === "Home widgets",
  );

  const dashboardContent = dashboardSection?.content ?? {};
  const rawWidgets = Array.isArray(dashboardContent["statusWidgets"])
    ? dashboardContent["statusWidgets"]
    : [];

  const statusWidgets: PublicHouseHomeStatusItem[] = rawWidgets
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `widget-${index}`,
      label: String(item.label ?? "").slice(0, 30),
      value: formatWidgetValue(item.value),
    }))
    .filter((item) => item.label && item.value);


  console.log("BUILD_STATUS_STRIP_RESULT", {
    slug,
    tariffAmount: house?.tariff_amount,
    statusStrip: statusWidgets,
  });

  return {
    heroContent: {
      headline:
        asString(heroContent.headline) || houseSystemCopy.homeDashboard.hero.headlineFallback,
      subheadline:
        asString(heroContent.subheadline) ||
        houseSystemCopy.homeDashboard.hero.subheadlineFallback,
    },
    statusStrip: statusWidgets,
    topAlert: pickTopAlert(slug, informationSections, meetingsSections),
    widgets: [
      buildAnnouncementsWidget(slug, announcementsSections),
      buildPlanWidget(slug, planSections),
      buildMeetingsWidget(slug, meetingsSections),
      buildDebtorsWidget(slug, debtorsSections),
    ],
  };
}
