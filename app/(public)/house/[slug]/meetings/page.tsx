import { houseMeetingsCopy, houseSystemCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { getAdminHouseApartments } from "@/src/modules/apartments/services/getAdminHouseApartments";

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


export default async function PublicMeetingsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const { house, sections } =
    await getPublishedHomeSectionsBySlug(slug);

  const districtColor = house.district?.theme_color ?? "#0f172a";
  const apartments =
    house?.id
      ? (await getAdminHouseApartments({ houseId: house.id })).items
      : [];


  const meetingsSection = sections.find((section) => section.kind === "meetings");

  const content =
    meetingsSection &&
    typeof meetingsSection.content === "object" &&
    meetingsSection.content
      ? (meetingsSection.content as Record<string, unknown>)
      : {};

  const items = Array.isArray(content.items)
    ? (content.items as MeetingItem[])
    : [];

  const publicMeetings = items.filter(
    (item) => item.status !== "draft",
  );

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

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid gap-6">
        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {houseMeetingsCopy.page.title}
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {houseMeetingsCopy.page.description}
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
              {[
                ["scheduled", houseMeetingsCopy.tabs.scheduled],
                ["active", houseMeetingsCopy.tabs.active],
                ["review", houseMeetingsCopy.tabs.review],
                ["completed", houseMeetingsCopy.tabs.completed],
                ["archive", houseMeetingsCopy.tabs.archive],
              ].map(([mode, label]) => {
                const isActive = selectedMode === mode;
                const count = counts[mode as keyof typeof counts];

                return (
                  <Link
                    key={mode}
                    href={`/house/${slug}/meetings?mode=${mode}`}
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                      isActive
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                    style={isActive ? { backgroundColor: districtColor } : undefined}
                  >
                    <span>{label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {selectedMode === "archive" ? (
            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                <Link
                  href={`/house/${slug}/meetings?mode=archive&month=all`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedMonth === "all"
                      ? "text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                  style={selectedMonth === "all" ? { backgroundColor: districtColor } : undefined}
                >
                  {houseMeetingsCopy.archive.all}
                </Link>
                {availableMonths.map((month) => {
                  const isActive = selectedMonth === String(month);

                  return (
                    <Link
                      key={month}
                      href={`/house/${slug}/meetings?mode=archive&month=${month}`}
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "text-white shadow-sm"
                          : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                      style={isActive ? { backgroundColor: districtColor } : undefined}
                    >
                      {new Date(2026, month - 1, 1).toLocaleString(houseMeetingsCopy.archive.locale, {
                        month: "long",
                      })}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {selectedMode === "scheduled" && nearestMeeting ? (
          <section className="rounded-[32px] border border-emerald-200 bg-emerald-50 p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {houseMeetingsCopy.page.nearest}
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-emerald-900">
              {nearestMeeting.title}
            </h2>
            <div className="mt-3 text-sm text-emerald-800">
              {formatDate(nearestMeeting.meetingDateTime)}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          {filteredMeetings.length === 0 ? (
            <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-xl font-semibold text-slate-900">
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
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
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
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-2xl font-semibold text-slate-950">
                  {meeting.title}
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>

              <div className="mt-3 text-sm text-slate-500">
                {formatDate(meeting.meetingDateTime)}
              </div>

              {meeting.questions.map((question) => (
                <div
                  key={question.id}
                  className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="font-medium text-slate-950">
                    {question.title}
                  </div>

                  {question.description ? (
                    <div className="mt-2 text-sm text-slate-600">
                      {question.description}
                    </div>
                  ) : null}

                  {(meeting.status === "review" ||
                    meeting.status === "completed" ||
                    meeting.status === "archived") ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 text-xs text-slate-600">
                        {houseMeetingsCopy.votes.for}: {getVotePercent(question.votesFor, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-xl bg-white p-3 text-xs text-slate-600">
                        {houseMeetingsCopy.votes.against}: {getVotePercent(question.votesAgainst, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-xl bg-white p-3 text-xs text-slate-600">
                        {houseMeetingsCopy.votes.abstained}: {getVotePercent(question.votesAbstained, question.totalApartmentsVoted)}%
                      </div>
                    </div>
                  ) : null}

                </div>
              ))}

              {meeting.status === "active" ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {houseMeetingsCopy.activeNote}
                </div>
              ) : null}

              {(meeting.status === "review" ||
                meeting.status === "completed" ||
                meeting.status === "archived") ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {houseMeetingsCopy.voters.voted}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      {(meeting.manualVotes ?? []).length > 0 ? (
                        (meeting.manualVotes ?? []).map((vote) => (
                          <div key={vote.apartmentId}>
                            {vote.apartmentLabel}
                          </div>
                        ))
                      ) : (
                        <div>{houseMeetingsCopy.voters.empty}</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {meeting.status === "completed" || meeting.status === "archived"
                        ? "{houseMeetingsCopy.voters.notVoted}"
                        : "{houseMeetingsCopy.voters.notYet}"}
                    </div>
                    <div className="mt-3 text-sm text-slate-600">
                      {apartments
                        .filter(
                          (apartment) =>
                            !(meeting.manualVotes ?? []).some(
                              (vote) => vote.apartmentId === apartment.id,
                            ),
                        )
                        .map((apartment) => apartment.apartment_label)
                        .join(", ") || "{houseMeetingsCopy.archive.all} квартиры уже учтены"}
                    </div>
                  </div>
                </div>
              ) : null}

              {(meeting.status === "completed" ||
                meeting.status === "archived") &&
              meeting.protocolPdf ? (
                <PublicReportPdfViewer
                  filePath={meeting.protocolPdf}
                  fileName={`Протокол — ${meeting.title}`}
                />
              ) : null}
            </article>
          ))
          )}
        </section>
      </div>
    </section>
  );
}
