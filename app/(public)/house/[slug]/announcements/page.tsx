import { houseAnnouncementsCopy } from "@/src/shared/publicCopy/house";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseAnnouncements } from "@/src/modules/houses/services/getPublishedHouseAnnouncements";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import type { PubTone } from "@/src/shared/ui/public/pubStyles";

type AnnouncementsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ filter?: string }>;
};

// Семантика рівня: тон бейджа + колір лівої смужки. Лейбли — з copy.
const LEVEL_META: Record<
  "danger" | "warning" | "info",
  { label: string; tone: PubTone; strip: string }
> = {
  danger: {
    label: houseAnnouncementsCopy.levels.danger,
    tone: "danger",
    strip: "bg-[var(--pub-danger-text)]",
  },
  warning: {
    label: houseAnnouncementsCopy.levels.warning,
    tone: "warning",
    strip: "bg-[var(--pub-warning-text)]",
  },
  info: {
    label: houseAnnouncementsCopy.levels.info,
    tone: "accent",
    strip: "bg-[var(--pub-accent)]",
  },
};

type AnnouncementPdf = {
  bucket: string;
  path: string;
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
};

type AnnouncementLevel = keyof typeof LEVEL_META;
type AnnouncementFilter = "all" | AnnouncementLevel;

function normalizeLevel(value: unknown): AnnouncementLevel {
  return value === "danger" || value === "warning" || value === "info"
    ? value
    : "info";
}

function normalizeAnnouncementPdf(value: unknown): AnnouncementPdf | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<AnnouncementPdf>;
  const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
  const path = typeof record.path === "string" ? record.path.trim() : "";

  if (!bucket || !path) {
    return null;
  }

  return {
    bucket,
    path,
    originalName:
      typeof record.originalName === "string" && record.originalName.trim()
        ? record.originalName.trim()
        : null,
    mimeType:
      typeof record.mimeType === "string" && record.mimeType.trim()
        ? record.mimeType.trim()
        : "application/pdf",
    size:
      typeof record.size === "number" && Number.isFinite(record.size)
        ? record.size
        : null,
    uploadedAt:
      typeof record.uploadedAt === "string" && record.uploadedAt.trim()
        ? record.uploadedAt.trim()
        : null,
  };
}

function renderAnnouncementPdfViewer(params: {
  content: Record<string, unknown>;
  announcementId: string;
  announcementTitle: string | null;
  houseId: string;
  houseSlug: string;
}) {
  const pdf = normalizeAnnouncementPdf(params.content.pdf);

  if (!pdf) {
    return null;
  }

  return (
    <PublicReportPdfViewer
      filePath={pdf.path}
      fileName={pdf.originalName ?? "PDF оголошення"}
      bucket={pdf.bucket}
      entityType="house_announcement"
      entityId={params.announcementId}
      fieldKey="pdf"
      buttonLabel="Переглянути PDF"
      modalTitle={params.announcementTitle || "PDF оголошення"}
      analyticsHouseId={params.houseId}
      analyticsHouseSlug={params.houseSlug}
      analyticsEntityId={params.announcementId}
      analyticsDocumentType="house_announcement_pdf"
    />
  );
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

function getAnnouncementBody(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return houseAnnouncementsCopy.empty.noText;
  }

  return value.trim();
}

export default async function PublicHouseAnnouncementsPage({
  params,
  searchParams,
}: AnnouncementsPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filter = normalizeFilter(resolvedSearchParams.filter);

  const house = await getHouseBySlug(slug);

  if (!house) {
    return null;
  }

  const allAnnouncements = (await getPublishedHouseAnnouncements(house.id))
    .map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      content: {
        body: announcement.body,
        level: announcement.level,
        isPinned: announcement.is_pinned,
        publishedAt: announcement.published_at,
        updatedAt: announcement.updated_at,
        createdAt: announcement.published_at ?? announcement.updated_at,
        pdf: announcement.pdf ?? null,
      },
    }))
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

  const filterItems: PubFilterTabItem[] = [
    {
      key: "all",
      href: "/announcements?filter=all",
      label: houseAnnouncementsCopy.filters.all,
      count: allAnnouncements.length,
      active: filter === "all",
    },
    ...levels.map((level) => ({
      key: level,
      href: `/announcements?filter=${level}`,
      label: LEVEL_META[level].label,
      count: levelCounts[level],
      active: filter === level,
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

      return content.isPinned === true;
    }) ?? null;

  const feedAnnouncements = pinnedAnnouncement
    ? filteredAnnouncements.filter((section) => section.id !== pinnedAnnouncement.id)
    : filteredAnnouncements;

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={houseAnnouncementsCopy.page.title}
        description={houseAnnouncementsCopy.page.description}
      >
        <PubFilterTabs items={filterItems} ariaLabel={houseAnnouncementsCopy.page.title} />
      </PubSectionHeader>

      <section className="min-w-0">
        <div className="mb-4 flex flex-col items-start gap-2 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <h2 className="font-[var(--font-serif)] text-xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-2xl">
            {houseAnnouncementsCopy.page.feedTitle}
          </h2>
          <div className="text-sm text-[var(--pub-text-soft)]">
            {houseAnnouncementsCopy.page.shown}: {filteredAnnouncements.length}
          </div>
        </div>

        {pinnedAnnouncement
          ? (() => {
              const content =
                typeof pinnedAnnouncement.content === "object" && pinnedAnnouncement.content
                  ? (pinnedAnnouncement.content as Record<string, unknown>)
                  : {};

              const level = normalizeLevel(content.level);
              const meta = LEVEL_META[level];
              const publishedAt = formatPublishedAt(content.publishedAt);
              const pdfViewer = renderAnnouncementPdfViewer({
                content,
                announcementId: pinnedAnnouncement.id,
                announcementTitle: pinnedAnnouncement.title,
                houseId: house.id,
                houseSlug: house.slug,
              });

              return (
                <article className="relative mb-5 w-full min-w-0 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 pl-6 shadow-[var(--pub-shadow-md)] sm:p-7 sm:pl-8">
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-5 bottom-5 w-1 rounded-[var(--r-pill)] ${meta.strip}`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--pub-bg-quiet)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-muted)]">
                      <PubIcon name="alert" className="h-3.5 w-3.5" />
                      {houseAnnouncementsCopy.page.pinned}
                    </span>
                    <PubBadge tone={meta.tone} withDot>
                      {meta.label}
                    </PubBadge>
                  </div>

                  <h2 className="mt-4 break-words font-[var(--font-serif)] text-xl font-semibold tracking-tight text-[var(--pub-text)] sm:mt-5 sm:text-3xl">
                    {pinnedAnnouncement.title ?? houseAnnouncementsCopy.page.importantFallback}
                  </h2>

                  <div className="mt-2 text-sm text-[var(--pub-text-soft)]">{publishedAt}</div>

                  <div className="mt-5 h-px bg-[var(--pub-border)]" />

                  <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--pub-text-muted)] sm:mt-5 sm:text-base sm:leading-8">
                    {typeof content.body === "string" && content.body.trim()
                      ? content.body
                      : houseAnnouncementsCopy.empty.noText}
                  </div>

                  {pdfViewer}

                </article>
              );
            })()
          : null}

        {filteredAnnouncements.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-6 text-center text-sm text-[var(--pub-text-muted)]">
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
              const meta = LEVEL_META[level];
              const publishedAt = formatPublishedAt(content.publishedAt);
              const pdfViewer = renderAnnouncementPdfViewer({
                content,
                announcementId: section.id,
                announcementTitle: section.title,
                houseId: house.id,
                houseSlug: house.slug,
              });

              return (
                <article
                  key={section.id}
                  className="relative w-full min-w-0 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 pl-6 shadow-[var(--pub-shadow-sm)] transition hover:shadow-[var(--pub-shadow-md)]"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-5 bottom-5 w-1 rounded-[var(--r-pill)] ${meta.strip}`}
                  />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold tracking-tight text-[var(--pub-text)]">
                        {section.title ?? houseAnnouncementsCopy.page.importantFallback}
                      </h3>
                      <div className="mt-1.5 text-sm text-[var(--pub-text-soft)]">{publishedAt}</div>
                    </div>
                    <PubBadge tone={meta.tone} withDot>
                      {meta.label}
                    </PubBadge>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--pub-text-muted)] sm:mt-4 sm:text-[15px] sm:leading-7">
                    {getAnnouncementBody(content.body)}
                  </div>
                  {pdfViewer}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
