import { houseMeetingsCopy, houseSystemCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicReportPdfViewer } from "@/src/modules/houses/components/PublicReportPdfViewer";
import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";

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
      ? await getPublicHouseApartmentOptions({ houseId: house.id })
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
    <section className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid min-w-0 gap-6">
        <section className="w-full min-w-0 rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="min-w-0 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1F2A37] sm:text-4xl lg:text-6xl">
              {houseMeetingsCopy.page.title}
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5B6B7C] sm:mt-5 sm:text-lg sm:leading-8">
              {houseMeetingsCopy.page.description}
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-sm backdrop-blur-sm">
            <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
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
                        ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                        : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                    }`}
                    style={isActive ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", "borderColor": districtColor } as React.CSSProperties : undefined}
                  >
                    <span>{label}</span>
                    <span
                      className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]" : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
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
            <div className="mt-4 w-full min-w-0">
              <div className="flex w-full min-w-0 justify-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                <Link
                  href={`/house/${slug}/meetings?mode=archive&month=all`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedMonth === "all"
                      ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                      : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                  }`}
                  style={selectedMonth === "all" ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", "borderColor": districtColor } as React.CSSProperties : undefined}
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
                          ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                          : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
                      }`}
                      style={isActive ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", "borderColor": districtColor } as React.CSSProperties : undefined}
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
          <section className="w-full min-w-0 rounded-[24px] border border-[#D4E3D8] bg-[#E6EFE8] p-4 sm:rounded-[32px] sm:p-6">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1D5E44]">
              {houseMeetingsCopy.page.nearest}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-[#1F2A37] sm:mt-4 sm:text-3xl">
              {nearestMeeting.title}
            </h2>
            <div className="mt-3 text-sm text-[#1D5E44]">
              {formatDate(nearestMeeting.meetingDateTime)}
            </div>
          </section>
        ) : null}

        <section className="min-w-0 space-y-4">
          {filteredMeetings.length === 0 ? (
            <div className="rounded-[24px] border border-[#E4DBD1] bg-[#F3EEE8] p-4 text-center shadow-sm sm:rounded-[32px] sm:p-8">
              <div className="text-base font-semibold text-slate-900 sm:text-xl">
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
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#5B6B7C]">
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
              className="w-full min-w-0 rounded-[22px] border border-[#E2D8CC] bg-[#F9F6F2] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-6"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 break-words text-lg font-semibold text-[#1F2A37] sm:text-2xl">
                  {meeting.title}
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    meeting.status === "review"
                      ? "border-[#D4E3D8] bg-[#E6EFE8] text-[#2F6F4F]"
                      : "border-[#D2C6B8] bg-[#E7DED3] text-[#2F3A4F]"
                  }`}
                >
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>

              <div className="mt-3 text-sm text-[#5F5A54]">
                {formatDate(meeting.meetingDateTime)}
              </div>

              {meeting.questions.map((question) => (
                <div
                  key={question.id}
                  className="mt-3 rounded-xl border border-[#E4DBD1] bg-[#F3EEE8] p-3 sm:mt-4 sm:rounded-2xl sm:p-4"
                >
                  <div className="break-words font-medium text-[#1F2A37]">
                    {question.title}
                  </div>

                  {question.description ? (
                    <div className="mt-2 break-words text-sm text-[#5B6B7C]">
                      {question.description}
                    </div>
                  ) : null}

                  {(meeting.status === "review" ||
                    meeting.status === "completed" ||
                    meeting.status === "archived") ? (
                    <div className="mt-3 space-y-2 sm:grid sm:gap-2 sm:grid-cols-3 sm:space-y-0">
                      <div className="rounded-xl border border-[#E4DBD1] bg-[#FBF8F4] p-3 text-xs text-[#5B6B7C]">
                        {houseMeetingsCopy.votes.for}: {getVotePercent(question.votesFor, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-xl border border-[#E4DBD1] bg-[#FBF8F4] p-3 text-xs text-[#5B6B7C]">
                        {houseMeetingsCopy.votes.against}: {getVotePercent(question.votesAgainst, question.totalApartmentsVoted)}%
                      </div>
                      <div className="rounded-xl border border-[#E4DBD1] bg-[#FBF8F4] p-3 text-xs text-[#5B6B7C]">
                        {houseMeetingsCopy.votes.abstained}: {getVotePercent(question.votesAbstained, question.totalApartmentsVoted)}%
                      </div>
                    </div>
                  ) : null}

                </div>
              ))}

              {meeting.status === "active" ? (
                <div className="mt-4 rounded-2xl border border-[#E6D7C6] bg-[#F5EFE6] p-4 text-sm text-[#7A5C3E]">
                  {houseMeetingsCopy.activeNote}
                </div>
              ) : null}

              {(meeting.status === "review" ||
                meeting.status === "completed" ||
                meeting.status === "archived") ? (
                <div className="mt-3 space-y-3 sm:mt-4 sm:grid sm:gap-4 lg:grid-cols-2 sm:space-y-0">
                  <div className="min-w-0 rounded-2xl border border-[#E4DBD1] bg-[#F3EEE8] p-4">
                    <div className="text-sm font-semibold text-[#1F2A37]">
                      {houseMeetingsCopy.voters.voted}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-[#5B6B7C]">
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

                  <div className="min-w-0 rounded-2xl border border-[#E4DBD1] bg-[#F3EEE8] p-4">
                    <div className="text-sm font-semibold text-[#1F2A37]">
                      {meeting.status === "completed" || meeting.status === "archived"
                        ? houseMeetingsCopy.voters.notVoted
                        : houseMeetingsCopy.voters.notYet}
                    </div>
                    <div className="mt-3 whitespace-pre-wrap break-words text-sm text-[#5B6B7C]">
                      {apartments
                        .filter(
                          (apartment) =>
                            !(meeting.manualVotes ?? []).some(
                              (vote) => vote.apartmentId === apartment.id,
                            ),
                        )
                        .map((apartment) => apartment.label)
                        .join(",\n") || "Усі квартири вже враховані"}
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
