import { houseAnnouncementsCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";

type AnnouncementsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ filter?: string }>;
};

const LEVEL_META = {
  danger: {
    label: houseAnnouncementsCopy.levels.danger,
    shell: "border-red-200 bg-red-50/80",
    accent: "bg-red-500",
    title: "text-red-900",
    body: "text-red-950",
    meta: "text-red-700/80",
    badge: "bg-red-100 text-red-700",
  },
  warning: {
    label: houseAnnouncementsCopy.levels.warning,
    shell: "border-amber-200 bg-amber-50/80",
    accent: "bg-amber-500",
    title: "text-amber-900",
    body: "text-amber-950",
    meta: "text-amber-700/80",
    badge: "bg-amber-100 text-amber-700",
  },
  info: {
    label: houseAnnouncementsCopy.levels.info,
    shell: "border-slate-200 bg-white",
    accent: "bg-slate-300",
    title: "text-slate-900",
    body: "text-slate-800",
    meta: "text-slate-500",
    badge: "bg-slate-100 text-slate-700",
  },
} as const;

type AnnouncementLevel = keyof typeof LEVEL_META;
type AnnouncementFilter = "all" | AnnouncementLevel;

function normalizeLevel(value: unknown): AnnouncementLevel {
  return value === "danger" || value === "warning" || value === "info"
    ? value
    : "info";
}

function normalizeFilter(value: unknown): AnnouncementFilter {
  return value === "danger" || value === "warning" || value === "info" || value === "all"
    ? value
    : "all";
}

function getSortTimestamp(content: Record<string, unknown>) {
  const candidates = [content.publishedAt, content.updatedAt, content.createdAt];

  for (const value of candidates) {
    if (typeof value === "string" && value) {
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) {
        return time;
      }
    }
  }

  return 0;
}

function formatPublishedAt(value: unknown) {
  if (typeof value !== "string" || !value) {
    return houseAnnouncementsCopy.date.recent;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return houseAnnouncementsCopy.date.recent;
  }

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function getBodyPreview(value: unknown, maxLength = 320) {
  if (typeof value !== "string" || !value.trim()) {
    return houseAnnouncementsCopy.empty.noText;
  }

  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}…`;
}

export default async function PublicHouseAnnouncementsPage({
  params,
  searchParams,
}: AnnouncementsPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filter = normalizeFilter(resolvedSearchParams.filter);

  const { house, sections } =
    await getPublishedHomeSectionsBySlug(slug);

  const districtColor = house.district?.theme_color ?? "#16a34a";

  const allAnnouncements = sections
    .filter((section) => section.kind === "announcements")
    .sort((a, b) => {
      const aContent =
        typeof a.content === "object" && a.content
          ? (a.content as Record<string, unknown>)
          : {};
      const bContent =
        typeof b.content === "object" && b.content
          ? (b.content as Record<string, unknown>)
          : {};

      return getSortTimestamp(bContent) - getSortTimestamp(aContent);
    });

  const levels: AnnouncementLevel[] = ["danger", "warning", "info"];

  const levelCounts = {
    danger: allAnnouncements.filter((section) => {
      const content =
        typeof section.content === "object" && section.content
          ? (section.content as Record<string, unknown>)
          : {};
      return normalizeLevel(content.level) === "danger";
    }).length,
    warning: allAnnouncements.filter((section) => {
      const content =
        typeof section.content === "object" && section.content
          ? (section.content as Record<string, unknown>)
          : {};
      return normalizeLevel(content.level) === "warning";
    }).length,
    info: allAnnouncements.filter((section) => {
      const content =
        typeof section.content === "object" && section.content
          ? (section.content as Record<string, unknown>)
          : {};
      return normalizeLevel(content.level) === "info";
    }).length,
  };

  const filterItems = [
    { key: "all" as const, label: houseAnnouncementsCopy.filters.all, count: allAnnouncements.length },
    ...levels.map((level) => ({
      key: level,
      label: LEVEL_META[level].label,
      count: levelCounts[level],
    })),
  ];

  const filteredAnnouncements = allAnnouncements.filter((section) => {
    if (filter === "all") {
      return true;
    }

    const content =
      typeof section.content === "object" && section.content
        ? (section.content as Record<string, unknown>)
        : {};

    return normalizeLevel(content.level) === filter;
  });

  const pinnedAnnouncement =
    filteredAnnouncements.find((section) => {
      const content =
        typeof section.content === "object" && section.content
          ? (section.content as Record<string, unknown>)
          : {};

      return normalizeLevel(content.level) === "danger";
    }) ?? null;

  const feedAnnouncements = pinnedAnnouncement
    ? filteredAnnouncements.filter((section) => section.id !== pinnedAnnouncement.id)
    : filteredAnnouncements;

  

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {houseAnnouncementsCopy.page.title}
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {houseAnnouncementsCopy.page.description}
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
              {filterItems.map((item) => {
                const isActive = filter === item.key;

                return (
                  <Link
                    key={item.key}
                    href={`/house/${slug}/announcements?filter=${item.key}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={isActive ? { backgroundColor: districtColor } : undefined}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {houseAnnouncementsCopy.page.feedTitle}
            </h2>
            <div className="text-sm text-slate-500">
              {houseAnnouncementsCopy.page.shown}: {filteredAnnouncements.length}
            </div>
          </div>

          {pinnedAnnouncement ? (
            <div className="mb-5">
              {(() => {
                const content =
                  typeof pinnedAnnouncement.content === "object" && pinnedAnnouncement.content
                    ? (pinnedAnnouncement.content as Record<string, unknown>)
                    : {};

                const level = normalizeLevel(content.level);
                const styles = LEVEL_META[level];
                const publishedAt = formatPublishedAt(content.publishedAt);

                return (
                  <article
                    className={`overflow-hidden rounded-[32px] border shadow-sm ${styles.shell}`}
                  >
                    <div className="flex">
                      <div className={`hidden w-2 shrink-0 ${styles.accent} sm:block`} />

                      <div className="flex-1 p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                            <span>📌</span>
                            <span>{houseAnnouncementsCopy.page.pinned}</span>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}
                          >
                            {styles.label}
                          </div>
                        </div>

                        <h2
                          className={`mt-5 text-2xl font-semibold tracking-tight sm:text-3xl ${styles.title}`}
                        >
                          {pinnedAnnouncement.title ?? houseAnnouncementsCopy.page.importantFallback}
                        </h2>

                        <div className={`mt-3 text-sm ${styles.meta}`}>{publishedAt}</div>

                        <div className="mt-5 h-px bg-black/5" />

                        <div
                          className={`mt-5 whitespace-pre-wrap text-base leading-8 ${styles.body}`}
                        >
                          {typeof content.body === "string" && content.body.trim()
                            ? content.body
                            : houseAnnouncementsCopy.empty.noText}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}
            </div>
          ) : null}

          {filteredAnnouncements.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-6 text-slate-500">
              За обраним фільтром оголошення поки не знайдені.
            </div>
          ) : (
            <div className="space-y-4">
              {feedAnnouncements.map((section) => {
                const content =
                  typeof section.content === "object" && section.content
                    ? (section.content as Record<string, unknown>)
                    : {};

                const level = normalizeLevel(content.level);
                const styles = LEVEL_META[level];
                const publishedAt = formatPublishedAt(content.publishedAt);

                return (
                  <article
                    key={section.id}
                    className={`overflow-hidden rounded-[28px] border shadow-sm transition hover:shadow-md ${styles.shell}`}
                  >
                    <div className="flex">
                      <div className={`hidden w-1.5 shrink-0 ${styles.accent} sm:block`} />

                      <div className="flex-1 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className={`text-lg font-semibold tracking-tight ${styles.title}`}>
                              {section.title ?? houseAnnouncementsCopy.page.importantFallback}
                            </h3>
                            <div className={`mt-2 text-sm ${styles.meta}`}>{publishedAt}</div>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}
                          >
                            {styles.label}
                          </div>
                        </div>

                        <div
                          className={`mt-4 whitespace-pre-wrap text-sm leading-7 sm:text-[15px] ${styles.body}`}
                        >
                          {getBodyPreview(content.body, 320)}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
