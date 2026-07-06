import { houseMeetingsCopy, houseSystemCopy } from "@/src/shared/publicCopy/house";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseMeetings } from "@/src/modules/houses/services/getPublishedHouseMeetings";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";
import { readHouseSessionToken } from "@/src/modules/houses/services/readHouseSessionToken";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    mode?: string;
    year?: string;
    month?: string;
  }>;
};

type MeetingLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

type ManualVoteChoice = "for" | "against" | "abstained";

type ManualVoteAnswer = {
  questionId: string;
  choice: ManualVoteChoice;
};

type ManualVoteEntry = {
  apartmentId: string;
  apartmentLabel: string;
  submittedAt: string;
  answers: ManualVoteAnswer[];
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
  manualVotes?: ManualVoteEntry[];
  questions: MeetingQuestion[];
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return houseSystemCopy.date.unknown;
  }

  return date.toLocaleString(houseMeetingsCopy.archive.locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVotePercent(value?: number, total?: number) {
  if (!value || !total || total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function getMeetingStatusLabel(status: MeetingLifecycleStatus) {
  if (status === "scheduled") return houseMeetingsCopy.status.scheduled;
  if (status === "active") return houseMeetingsCopy.status.active;
  if (status === "review") return houseMeetingsCopy.status.review;
  if (status === "completed") return houseMeetingsCopy.status.completed;
  return houseMeetingsCopy.status.archived;
}

function normalizePublicApartmentLabel(label: string) {
  const trimmed = label.trim();
  const withoutPrefix = trimmed.replace(/^кв\.?\s*/i, "").trim();
  const withoutOwner = withoutPrefix.replace(/\s+—.*$/u, "").trim();

  return withoutOwner || withoutPrefix || trimmed;
}

function formatPublicApartmentLabel(label: string) {
  const normalized = normalizePublicApartmentLabel(label);

  if (/^(кв\.?|прим\.?)\s+/i.test(normalized)) {
    return normalized;
  }

  return `Кв. ${normalized}`;
}

function formatManualVoteApartmentLabel(
  vote: ManualVoteEntry,
  apartments: Array<{ id: string; label: string }>,
) {
  const apartment = apartments.find((item) => item.id === vote.apartmentId);

  return formatPublicApartmentLabel(apartment?.label ?? vote.apartmentLabel);
}

function getApartmentLabelKey(label: string) {
  return normalizePublicApartmentLabel(label).toLowerCase();
}

function getNotVotedApartmentLabels(
  meeting: MeetingItem,
  apartments: Array<{ id: string; label: string }>,
) {
  const votedLabelKeys = new Set(
    (meeting.manualVotes ?? [])
      .map((vote) => getApartmentLabelKey(vote.apartmentLabel))
      .filter(Boolean),
  );

  const notVotedByLabel = new Map<string, string>();

  for (const apartment of apartments) {
    const formattedLabel = formatPublicApartmentLabel(apartment.label);
    const key = getApartmentLabelKey(formattedLabel);

    if (!key || votedLabelKeys.has(key) || notVotedByLabel.has(key)) {
      continue;
    }

    notVotedByLabel.set(key, formattedLabel);
  }

  return Array.from(notVotedByLabel.values()).sort((left, right) =>
    left.localeCompare(right, "uk", {
      numeric: true,
    }),
  );
}

export default async function PublicMeetingsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const house = await getHouseBySlug(slug);

  if (!house) {
    return null;
  }

  const sessionToken =
    (await readHouseSessionToken(slug)) ?? "";

  const apartments = sessionToken
    ? await getPublicHouseApartmentOptions({
        houseId: house.id,
        sessionToken,
      })
    : [];

  const meetingsSnapshot =
    await getPublishedHouseMeetings({
      houseId: house.id,
      sessionToken,
    });

  const publicMeetings: MeetingItem[] = meetingsSnapshot.items
    .filter((item) => item.status !== "draft")
    .map((item) => ({
      id: item.id,
      title: item.title,
      shortDescription: item.shortDescription,
      meetingDateTime: item.meetingDateTime,
      location: item.location,
      status: item.status,
      protocolPdf: item.protocolPdf,
      protocolDocumentId: item.protocolDocumentId,
      manualVotes: item.manualVotes,
      questions: item.questions.map((question) => ({
        id: question.id,
        title: question.title,
        description: question.description,
        decisionDraft: question.decisionDraft,
        votesFor: question.votesFor,
        votesAgainst: question.votesAgainst,
        votesAbstained: question.votesAbstained,
        totalApartmentsVoted: question.totalApartmentsVoted,
        approvalOutcome: question.approvalOutcome,
      })),
    }));

  const scheduled = publicMeetings.filter((item) => item.status === "scheduled");
  const active = publicMeetings.filter((item) => item.status === "active");
  const review = publicMeetings.filter((item) => item.status === "review");
  const completed = publicMeetings.filter((item) => item.status === "completed");
  const archived = publicMeetings.filter((item) => item.status === "archived");

  const counts = {
    scheduled: scheduled.length,
    active: active.length,
    review: review.length,
    completed: completed.length,
    archive: archived.length,
  };

  const nearestMeeting =
    scheduled.length > 0
      ? [...scheduled].sort(
          (a, b) =>
            new Date(a.meetingDateTime).getTime() -
            new Date(b.meetingDateTime).getTime(),
        )[0]
      : null;

  const selectedMode =
    resolvedSearchParams.mode === "archive"
      ? "archive"
      : resolvedSearchParams.mode === "active"
        ? "active"
        : resolvedSearchParams.mode === "review"
          ? "review"
          : resolvedSearchParams.mode === "completed"
            ? "completed"
            : "scheduled";

  const availableMonths = Array.from(
    new Set(
      archived
        .map((item) => new Date(item.meetingDateTime).getMonth() + 1)
        .filter((month) => !Number.isNaN(month)),
    ),
  ).sort((a, b) => a - b);

  const selectedMonth = resolvedSearchParams.month ?? "all";

  const filteredMeetings =
    selectedMode === "archive"
      ? archived.filter((meeting) => {
          const meetingDate = new Date(meeting.meetingDateTime);

          if (selectedMonth !== "all") {
            const month = meetingDate.getMonth() + 1;
            if (Number.isNaN(month) || String(month) !== selectedMonth) {
              return false;
            }
          }

          return true;
        })
      : publicMeetings.filter((meeting) => {
          if (selectedMode === "scheduled") {
            return meeting.status === "scheduled";
          }

          if (selectedMode === "active") {
            return meeting.status === "active";
          }

          if (selectedMode === "review") {
            return meeting.status === "review";
          }

          if (selectedMode === "completed") {
            return meeting.status === "completed";
          }

          return false;
        });

  const modeTabs: PubFilterTabItem[] = (
    [
      ["scheduled", houseMeetingsCopy.tabs.scheduled],
      ["active", houseMeetingsCopy.tabs.active],
      ["review", houseMeetingsCopy.tabs.review],
      ["completed", houseMeetingsCopy.tabs.completed],
      ["archive", houseMeetingsCopy.tabs.archive],
    ] as const
  ).map(([mode, label]) => ({
    key: mode,
    label,
    href: `/meetings?mode=${mode}`,
    count: counts[mode as keyof typeof counts],
    active: selectedMode === mode,
  }));

  const monthTabs: PubFilterTabItem[] = [
    {
      key: "all",
      label: houseMeetingsCopy.archive.all,
      href: "/meetings?mode=archive&month=all",
      active: selectedMonth === "all",
    },
    ...availableMonths.map((month) => ({
      key: String(month),
      label: new Date(2026, month - 1, 1).toLocaleString(
        houseMeetingsCopy.archive.locale,
        { month: "long" },
      ),
      href: `/meetings?mode=archive&month=${month}`,
      active: selectedMonth === String(month),
    })),
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={houseMeetingsCopy.page.title}
        description={houseMeetingsCopy.page.description}
      >
        <div className="grid gap-4">
          <PubFilterTabs items={modeTabs} ariaLabel={houseMeetingsCopy.page.title} />
          {selectedMode === "archive" ? (
            <PubFilterTabs items={monthTabs} framed={false} ariaLabel="Місяць архіву" />
          ) : null}
        </div>
      </PubSectionHeader>

      {selectedMode === "scheduled" && nearestMeeting ? (
        <section className="relative w-full min-w-0 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] p-5 pl-6 sm:p-6 sm:pl-7">
          <span
            aria-hidden="true"
            className="absolute left-0 top-5 bottom-5 w-1 rounded-[var(--r-pill)] bg-[var(--pub-success-text)]"
          />
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-success-text)]">
            {houseMeetingsCopy.page.nearest}
          </div>
          <h2 className="mt-3 font-[var(--font-serif)] text-xl font-semibold text-[var(--pub-text)] sm:mt-4 sm:text-3xl">
            {nearestMeeting.title}
          </h2>
          <div className="mt-3 text-sm text-[var(--pub-success-text)]">
            {formatDate(nearestMeeting.meetingDateTime)}
          </div>
        </section>
      ) : null}

      <section className="min-w-0 space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 text-center shadow-[var(--pub-shadow-sm)] sm:p-8">
            <div className="text-base font-semibold text-[var(--pub-text)] sm:text-xl">
              {selectedMode === "scheduled"
                ? houseMeetingsCopy.empty.scheduled
                : selectedMode === "active"
                  ? houseMeetingsCopy.empty.active
                  : selectedMode === "review"
                    ? houseMeetingsCopy.empty.review
                    : selectedMode === "completed"
                      ? houseMeetingsCopy.empty.completed
                      : houseMeetingsCopy.empty.archive}
            </div>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--pub-text-muted)]">
              {selectedMode === "scheduled"
                ? houseMeetingsCopy.empty.scheduledDesc
                : selectedMode === "active"
                  ? houseMeetingsCopy.empty.activeDesc
                  : selectedMode === "review"
                    ? houseMeetingsCopy.empty.reviewDesc
                    : selectedMode === "completed"
                      ? houseMeetingsCopy.empty.completedDesc
                      : houseMeetingsCopy.empty.archiveDesc}
            </p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <article
              key={meeting.id}
              className="w-full min-w-0 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-shadow-sm)] transition hover:shadow-[var(--pub-shadow-md)] sm:p-6"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 break-words font-[var(--font-serif)] text-lg font-semibold text-[var(--pub-text)] sm:text-2xl">
                  {meeting.title}
                </div>
                <PubBadge tone={meeting.status === "review" ? "success" : "neutral"} size="sm">
                  {getMeetingStatusLabel(meeting.status)}
                </PubBadge>
              </div>

              <div className="mt-3 text-sm text-[var(--pub-text-muted)]">
                {formatDate(meeting.meetingDateTime)}
              </div>

              {meeting.questions.map((question) => (
                <div
                  key={question.id}
                  className="mt-3 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-3 sm:mt-4 sm:p-4"
                >
                  <div className="break-words font-medium text-[var(--pub-text)]">
                    {question.title}
                  </div>

                  {question.description ? (
                    <div className="mt-2 break-words text-sm text-[var(--pub-text-muted)]">
                      {question.description}
                    </div>
                  ) : null}

                  {(meeting.status === "review" ||
                    meeting.status === "completed" ||
                    meeting.status === "archived") ? (
                    <div className="mt-3 space-y-2 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
                      <div className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 text-xs text-[var(--pub-text-muted)]">
                        {houseMeetingsCopy.votes.for}: {getVotePercent(question.votesFor, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 text-xs text-[var(--pub-text-muted)]">
                        {houseMeetingsCopy.votes.against}: {getVotePercent(question.votesAgainst, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 text-xs text-[var(--pub-text-muted)]">
                        {houseMeetingsCopy.votes.abstained}: {getVotePercent(question.votesAbstained, question.totalApartmentsVoted)}%
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}

              {meeting.status === "active" ? (
                <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--pub-warning-border)] bg-[var(--pub-warning-bg)] p-4 text-sm text-[var(--pub-warning-text)]">
                  {houseMeetingsCopy.activeNote}
                </div>
              ) : null}

              {(meeting.status === "active" ||
                meeting.status === "review" ||
                meeting.status === "completed" ||
                meeting.status === "archived") ? (
                <div className="mt-3 space-y-3 sm:mt-4 sm:grid sm:gap-4 lg:grid-cols-2 sm:space-y-0">
                  <div className="min-w-0 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4">
                    <div className="text-sm font-semibold text-[var(--pub-text)]">
                      {houseMeetingsCopy.voters.voted}
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-2 text-sm text-[var(--pub-text-muted)]">
                      {(meeting.manualVotes ?? []).length > 0 ? (
                        (meeting.manualVotes ?? []).map((vote) => (
                          <div key={vote.apartmentId}>
                            {formatManualVoteApartmentLabel(vote, apartments)}
                          </div>
                        ))
                      ) : (
                        <div>{houseMeetingsCopy.voters.empty}</div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4">
                    <div className="text-sm font-semibold text-[var(--pub-text)]">
                      {meeting.status === "completed" || meeting.status === "archived"
                        ? houseMeetingsCopy.voters.notVoted
                        : houseMeetingsCopy.voters.notYet}
                    </div>
                    <div className="mt-3 max-h-80 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words pr-2 text-sm text-[var(--pub-text-muted)]">
                      {getNotVotedApartmentLabels(meeting, apartments).join(",\n") ||
                        "Усі квартири вже враховані"}
                    </div>
                  </div>
                </div>
              ) : null}

              {(meeting.status === "completed" ||
                meeting.status === "archived") &&
              meeting.protocolPdf ? (
                <PublicReportPdfViewer
                  entityType="house_meeting"
                  entityId={meeting.id}
                  fieldKey="protocol"
                  houseSlug={house.slug}
                  fileName={`Протокол — ${meeting.title}`}
                  analyticsHouseId={house.id}
                  analyticsHouseSlug={house.slug}
                  analyticsEntityId={meeting.protocolDocumentId || meeting.id}
                  analyticsDocumentType="meeting_protocol"
                />
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
