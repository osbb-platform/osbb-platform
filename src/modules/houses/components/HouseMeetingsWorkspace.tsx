"use client";

import { useWorkspaceMemory } from "@/src/shared/hooks/useWorkspaceMemory";
import { WorkspaceListToolbar } from "@/src/modules/houses/components/WorkspaceListToolbar";
import { WorkspaceViewToggle, type WorkspaceViewMode } from "@/src/modules/houses/components/WorkspaceViewToggle";
import { WorkspaceQuickActions } from "@/src/modules/houses/components/WorkspaceQuickActions";
import { filterAndSortWorkspaceItems, type WorkspaceListSortMode } from "@/src/modules/houses/utils/workspaceList";

import {
  AdminStatusBadge,
  statusLabelFor,
  statusToneFor } from "@/src/shared/ui/admin/AdminStatusBadge";

import { useMemo,
  useState } from "react";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import type { AdminHouseMeetingsSnapshot } from "@/src/modules/houses/services/getAdminHouseMeetings";
import {
  adminInputClass,
  adminSurfaceClass,
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { useDirtyGuard } from "@/src/shared/hooks/useDirtyGuard";
import Link from "next/link";
import {
  findMeetingApartmentForVote,
  getAvailableMeetingApartments,
  getMeetingApartmentKey,
  normalizeMeetingApartmentLabel,
} from "@/src/modules/houses/utils/meetingApartmentIdentity";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";

type MeetingLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

type WorkspaceMode = "idle" | "create" | "edit";
type ConfirmAction = "delete" | "publish" | "archive" | null;

type MeetingQuestion = {
  id: string;
  order: number;
  title: string;
  description: string;
  decisionDraft: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstained: number;
  totalApartmentsVoted: number;
  approvalOutcome: "approved" | "rejected" | "pending";
};

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

type MeetingItem = {
  id: string;
  title: string;
  shortDescription: string;
  meetingDateTime: string;
  location: string;
  status: MeetingLifecycleStatus;
  lifecycleStatus?: "draft" | "published" | "archived";
  lockVersion: number;
  updatedAt: string;
  protocolPdf?: string;
  protocolDocumentId?: string;
  questions: MeetingQuestion[];
  manualVotes?: ManualVoteEntry[];
};

type Props = {
  canChangeWorkflowStatus?: boolean;
  houseId: string;
  houseSlug: string;
  hasApartments: boolean;
  apartments: Array<{
    id: string;
    apartmentLabel: string;
    ownerName?: string;
  }>;
  meetings: AdminHouseMeetingsSnapshot;
};

type WorkspaceTab = "active" | "draft" | "archived";

const tabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "active", label: "Активні" },
  { key: "draft", label: "Чернетки" },
  { key: "archived", label: "Архів" },
];

const scheduledStatusOptions: Array<{
  value: MeetingLifecycleStatus;
  label: string;
}> = [
  { value: "scheduled", label: "Заплановано" },
  { value: "active", label: "Голосування" },
  { value: "review", label: "На перевірці" },
  { value: "completed", label: "Завершено" },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createQuestion(order = 0): MeetingQuestion {
  return {
    id: createId("question"),
    order,
    title: "",
    description: "",
    decisionDraft: "",
    votesFor: 0,
    votesAgainst: 0,
    votesAbstained: 0,
    totalApartmentsVoted: 0,
    approvalOutcome: "pending",
  };
}

function createEmptyMeeting(): MeetingItem {
  const now = new Date().toISOString();

  return {
    id: createId("meeting"),
    title: "",
    shortDescription: "",
    meetingDateTime: "",
    location: "",
    status: "draft",
    updatedAt: now,
    lifecycleStatus: "draft",
    lockVersion: 1,
    protocolPdf: "",
    protocolDocumentId: "",
    questions: [createQuestion(0)],
  };
}

function normalizeMeetings(content: Record<string, unknown> | AdminHouseMeetingsSnapshot): MeetingItem[] {
  const rawItems: unknown[] = Array.isArray(
    (content as AdminHouseMeetingsSnapshot).items,
  )
    ? (content as AdminHouseMeetingsSnapshot).items
    : Array.isArray((content as Record<string, unknown>).items)
      ? ((content as Record<string, unknown>).items as unknown[])
      : [];

  return rawItems.map((item: unknown, index: number) => {
    const raw = (item ?? {}) as Record<string, unknown>;

    const legacyStatus =
      raw.status === "planned"
        ? "scheduled"
        : raw.status === "completed"
          ? "completed"
          : raw.status;

    const manualVotes = Array.isArray(raw.manualVotes)
      ? (raw.manualVotes as ManualVoteEntry[]).map((vote, voteIndex) => ({
          apartmentId: String(vote?.apartmentId ?? `legacy-apartment-${voteIndex}`),
          apartmentLabel: String(vote?.apartmentLabel ?? ""),
          submittedAt: String(
            vote?.submittedAt ?? new Date().toISOString(),
          ),
          answers: Array.isArray(vote?.answers)
            ? vote.answers.map((answer, answerIndex) => ({
                questionId: String(
                  answer?.questionId ?? `legacy-question-${answerIndex}`,
                ),
                choice:
                  answer?.choice === "for" ||
                  answer?.choice === "against" ||
                  answer?.choice === "abstained"
                    ? answer.choice
                    : "abstained",
              }))
            : [],
        }))
      : [];

    return {
      id: String(raw.id ?? `legacy-${index}`),
      title: String(raw.title ?? ""),
      shortDescription: String(raw.shortDescription ?? raw.description ?? ""),
      meetingDateTime: String(raw.meetingDateTime ?? raw.date ?? ""),
      location: String(raw.location ?? ""),
      status: (
        legacyStatus === "draft" ||
        legacyStatus === "scheduled" ||
        legacyStatus === "active" ||
        legacyStatus === "review" ||
        legacyStatus === "completed" ||
        legacyStatus === "archived"
          ? legacyStatus
          : "draft"
      ) as MeetingLifecycleStatus,
      lifecycleStatus:
        raw.lifecycleStatus === "draft" ||
        raw.lifecycleStatus === "published" ||
        raw.lifecycleStatus === "archived"
          ? raw.lifecycleStatus
          : undefined,
      lockVersion:
        typeof raw.lockVersion === "number" ? raw.lockVersion : 1,
      updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
      protocolPdf: String(raw.protocolPdf ?? ""),
      protocolDocumentId: String(raw.protocolDocumentId ?? ""),
      manualVotes,
      questions: Array.isArray(raw.questions)
        ? (raw.questions as MeetingQuestion[]).map((question, questionIndex) => ({
            id: String(question?.id ?? `legacy-question-${questionIndex}`),
            order:
              typeof question?.order === "number"
                ? question.order
                : questionIndex,
            title: String(question?.title ?? ""),
            description: String(question?.description ?? ""),
            decisionDraft: String(question?.decisionDraft ?? ""),
            votesFor:
              typeof question?.votesFor === "number" ? question.votesFor : 0,
            votesAgainst:
              typeof question?.votesAgainst === "number"
                ? question.votesAgainst
                : 0,
            votesAbstained:
              typeof question?.votesAbstained === "number"
                ? question.votesAbstained
                : 0,
            totalApartmentsVoted:
              typeof question?.totalApartmentsVoted === "number"
                ? question.totalApartmentsVoted
                : 0,
            approvalOutcome:
              question?.approvalOutcome === "approved" ||
              question?.approvalOutcome === "rejected" ||
              question?.approvalOutcome === "pending"
                ? question.approvalOutcome
                : "pending",
          }))
        : [createQuestion(0)],
    };
  });
}

function formatDate(value: string) {
  if (!value) return "Дату не вказано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дату не вказано";
  return date.toLocaleString("uk-UA");
}

function splitMeetingDateTime(value: string) {
  if (!value) {
    return { date: "", time: "" };
  }

  const normalized = value.trim();

  if (normalized.includes("T")) {
    const [datePart, timePart = ""] = normalized.split("T");
    return {
      date: datePart.slice(0, 10),
      time: timePart.slice(0, 5),
    };
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function combineMeetingDateTime(date: string, time: string) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}

function formatApartmentVoteLabel(apartment: {
  apartmentLabel: string;
  ownerName?: string | null;
}) {
  const label = apartment.apartmentLabel.trim();
  const normalizedLabel =
    /^(кв\.?|прим\.?)\s+/i.test(label) ? label : `Кв. ${label}`;

  return apartment.ownerName
    ? `${normalizedLabel} — ${apartment.ownerName}`
    : normalizedLabel;
}

function formatRecordedApartmentVoteLabel(
  vote: { apartmentId: string; apartmentLabel: string },
  apartments: Array<{
    id: string;
    apartmentLabel: string;
    ownerName?: string | null;
  }>,
) {
  const apartment = findMeetingApartmentForVote(vote, apartments);
  const apartmentLabel = normalizeMeetingApartmentLabel(
    apartment?.apartmentLabel ?? vote.apartmentLabel,
  );

  return formatApartmentVoteLabel({
    apartmentLabel,
    ownerName: apartment?.ownerName ?? null,
  });
}

function getNotParticipatingApartments(
  meeting: {
    manualVotes?: Array<{ apartmentId: string; apartmentLabel: string }>;
  },
  apartments: Array<{
    id: string;
    apartmentLabel: string;
    ownerName?: string | null;
  }>,
) {
  return getAvailableMeetingApartments(
    apartments,
    meeting.manualVotes ?? [],
  );
}

function formatNotParticipatingApartments(
  meeting: {
    manualVotes?: Array<{ apartmentId: string; apartmentLabel: string }>;
  },
  apartments: Array<{
    id: string;
    apartmentLabel: string;
    ownerName?: string | null;
  }>,
) {
  const notParticipating = getNotParticipatingApartments(meeting, apartments);

  if (notParticipating.length === 0) {
    return "усі квартири взяли участь";
  }

  return notParticipating.map(formatApartmentVoteLabel).join(", ");
}

function recalculateMeetingQuestionResults(
  meeting: MeetingItem,
  totalApartments: number,
): MeetingItem {
  const manualVotes = meeting.manualVotes ?? [];
  const totalApartmentsVoted = Math.max(0, totalApartments);

  return {
    ...meeting,
    questions: meeting.questions.map((question) => {
      let votesFor = 0;
      let votesAgainst = 0;
      let votesAbstained = 0;

      for (const vote of manualVotes) {
        const answer = vote.answers.find(
          (item) => item.questionId === question.id,
        );

        if (!answer) continue;

        if (answer.choice === "for") votesFor += 1;
        if (answer.choice === "against") votesAgainst += 1;
        if (answer.choice === "abstained") votesAbstained += 1;
      }

      const totalManualVotes = votesFor + votesAgainst + votesAbstained;
      const approvalOutcome =
        totalManualVotes === 0
          ? "pending"
          : votesFor > votesAgainst
            ? "approved"
            : "rejected";

      return {
        ...question,
        votesFor,
        votesAgainst,
        votesAbstained,
        totalApartmentsVoted,
        approvalOutcome,
      };
    }),
  };
}

export function HouseMeetingsWorkspace({
  houseId,
  hasApartments,
  apartments,
  meetings: meetingsSnapshot,
  canChangeWorkflowStatus,
}: Props) {
  const workflowAccessGranted = Boolean(canChangeWorkflowStatus);
  const { dispatch, isPending } = useAdminContentCommand();

  const [meetings, setMeetings] = useState<MeetingItem[]>(
    normalizeMeetings(meetingsSnapshot),
  );

  const [activeTab, setActiveTab] = useWorkspaceMemory<WorkspaceTab>(
    "meetings",
    "activeTab",
    "active",
    ["active", "draft", "archived"],
  );
  const [searchQuery, setSearchQuery] =
    useWorkspaceMemory("meetings", "searchQuery", "");
  const [sortMode, setSortMode] =
    useWorkspaceMemory<WorkspaceListSortMode>(
      "meetings",
      "sortMode",
      "newest",
      ["newest", "oldest", "title_asc"],
    );
  const [viewMode, setViewMode] = useWorkspaceMemory<WorkspaceViewMode>(
    "meetings",
    "viewMode",
    "rows",
    ["rows", "grid"],
  );
  const [visibleCount, setVisibleCount] = useState(20);

  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeetingItem>(createEmptyMeeting());
  const [meetingDateInput, setMeetingDateInput] = useState("");
  const [meetingTimeInput, setMeetingTimeInput] = useState("");
  const [selectedApartmentVote, setSelectedApartmentVote] = useState("");
  const [manualVoteAnswers, setManualVoteAnswers] = useState<
    Record<string, ManualVoteChoice>
  >({});
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [panelDirty, setPanelDirty] = useState(false);
  const dirtyGuard = useDirtyGuard({ isDirty: panelDirty });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const counters = useMemo(
    () => ({
      active: meetings.filter(
        (m) =>
          m.status === "scheduled" ||
          m.status === "active" ||
          m.status === "review" ||
          m.status === "completed",
      ).length,
      draft: meetings.filter((m) => m.status === "draft").length,
      archived: meetings.filter((m) => m.status === "archived").length,
    }),
    [meetings],
  );

  const availableVotingApartments = useMemo(
    () => getAvailableMeetingApartments(apartments, draft.manualVotes ?? []),
    [apartments, draft.manualVotes],
  );

  const baseVisibleMeetings = useMemo(() => {
    if (activeTab === "draft") {
      return meetings.filter((item) => item.status === "draft");
    }

    if (activeTab === "archived") {
      return meetings.filter((item) => item.status === "archived");
    }

    return meetings.filter(
      (item) =>
        item.status === "scheduled" ||
        item.status === "active" ||
        item.status === "review" ||
        item.status === "completed",
    );
  }, [meetings, activeTab]);

  const visibleMeetings = useMemo(
    () =>
      filterAndSortWorkspaceItems(
        baseVisibleMeetings,
        searchQuery,
        sortMode,
      ),
    [baseVisibleMeetings, searchQuery, sortMode],
  );

  const isContentLocked = false;

  function resetWorkspace() {
    setWorkspaceError(null);
    setConfirmAction(null);
    setMode("idle");
    setSelectedMeetingId(null);
    setDraft(createEmptyMeeting());
    setMeetingDateInput("");
    setMeetingTimeInput("");
    setSelectedApartmentVote("");
    setManualVoteAnswers({});
    setPanelDirty(false);
  }

  function openCreateWorkspace() {
    setWorkspaceError(null);
    setConfirmAction(null);
    setMode("create");
    setSelectedMeetingId(null);
    setDraft(createEmptyMeeting());
    setMeetingDateInput("");
    setMeetingTimeInput("");
    setSelectedApartmentVote("");
    setManualVoteAnswers({});
    setActiveTab("draft");
    setPanelDirty(false);
  }

  function openCreateMode() {
    if (!hasApartments) {
      setWorkspaceError(
        "Спочатку заповніть розділ «Квартири» для цього будинку. Без списку квартир неможливо створити збори та запустити голосування.",
      );
      return;
    }

    dirtyGuard.request(openCreateWorkspace);
  }

  function openEditMode(meeting: MeetingItem) {
    dirtyGuard.request(() => {
      const splitDateTime = splitMeetingDateTime(meeting.meetingDateTime);

      setMode("edit");
      setSelectedMeetingId(meeting.id);
      setDraft(meeting);
      setMeetingDateInput(splitDateTime.date);
      setMeetingTimeInput(splitDateTime.time);
      setSelectedApartmentVote("");
      setManualVoteAnswers({});
      setPanelDirty(false);
    });
  }

  function prepareQuickAction(
    meeting: MeetingItem,
    action: Exclude<ConfirmAction, null>,
  ) {
    setMode("idle");
    setSelectedMeetingId(meeting.id);
    setDraft(meeting);
    setPanelDirty(false);
    setConfirmAction(action);
  }

  function closeWorkspace() {
    dirtyGuard.request(resetWorkspace);
  }

  function handleTabChange(tab: WorkspaceTab) {
    dirtyGuard.request(() => {
      setActiveTab(tab);
      resetWorkspace();
    });
  }

  function markDirty() {
    if (!panelDirty) {
      setPanelDirty(true);
    }
  }

  function addQuestion() {
    setDraft((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        createQuestion(prev.questions.length),
      ],
    }));
  }

  function removeQuestion(questionId: string) {
    setDraft((prev) => {
      if (prev.questions.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        questions: prev.questions
          .filter((q) => q.id !== questionId)
          .map((q, index) => ({
            ...q,
            order: index,
          })),
      };
    });
  }

  function buildMeetingForSave(nextStatus?: MeetingLifecycleStatus): MeetingItem {
    const now = new Date().toISOString();

    return recalculateMeetingQuestionResults(
      {
        ...draft,
        title: draft.title.trim(),
        shortDescription: draft.shortDescription.trim(),
        location: draft.location.trim(),
        meetingDateTime: combineMeetingDateTime(
          meetingDateInput,
          meetingTimeInput,
        ),
        status: nextStatus ?? draft.status,
        updatedAt: now,
        questions: draft.questions.map((question, index) => ({
          ...question,
          order: index,
          title: question.title.trim(),
          description: question.description.trim(),
          decisionDraft: question.decisionDraft.trim(),
        })),
      },
      apartments.length,
    );
  }

  async function saveDraftToRegistry(nextStatus?: MeetingLifecycleStatus) {
    if (nextStatus && !workflowAccessGranted) return;
    const next = buildMeetingForSave(nextStatus);

    const payload = {
      title: next.title,
      shortDescription: next.shortDescription,
      meetingDateTime: next.meetingDateTime,
      location: next.location,
      status: next.status,
      protocolPdf: next.protocolPdf,
      protocolDocumentId: next.protocolDocumentId,
      questions: next.questions,
      manualVotes: next.manualVotes ?? [],
    };

    const saved = await dispatch<MeetingItem>(
      {
        type:
          mode === "edit" && selectedMeetingId
            ? "meetings.update"
            : "meetings.create",
        houseId,
        payload:
          mode === "edit" && selectedMeetingId
            ? {
                id: selectedMeetingId,
                lockVersion: draft.lockVersion,
                ...payload,
              }
            : payload,
      },
      { refreshOnSuccess: true },
    );

    if (!saved) return;

    const savedRecord = saved as unknown as Record<string, unknown>;
    const savedStatus = savedRecord.display_status;
    const savedMeeting: MeetingItem = {
      ...next,
      id: String(savedRecord.id ?? next.id),
      status:
        savedStatus === "draft" ||
        savedStatus === "scheduled" ||
        savedStatus === "active" ||
        savedStatus === "review" ||
        savedStatus === "completed" ||
        savedStatus === "archived"
          ? savedStatus
          : next.status,
      lifecycleStatus:
        savedRecord.lifecycle_status === "draft" ||
        savedRecord.lifecycle_status === "published" ||
        savedRecord.lifecycle_status === "archived"
          ? savedRecord.lifecycle_status
          : next.lifecycleStatus,
      lockVersion:
        typeof savedRecord.lock_version === "number"
          ? savedRecord.lock_version
          : next.lockVersion + 1,
      updatedAt: String(savedRecord.updated_at ?? next.updatedAt),
    };

    const nextMeetings =
      mode === "edit" && selectedMeetingId
        ? meetings.map((item) =>
            item.id === selectedMeetingId ? savedMeeting : item,
          )
        : [savedMeeting, ...meetings];

    setMeetings(nextMeetings);
    setActiveTab(savedMeeting.status === "archived" ? "archived" : savedMeeting.status === "draft" ? "draft" : "active");
    closeWorkspace();
  }

  async function deleteMeetingFromRegistry(meetingId: string) {
    const current = meetings.find((item) => item.id === meetingId);
    if (!current) return;

    const deleted = await dispatch(
      {
        type: "meetings.delete",
        houseId,
        payload: {
          id: meetingId,
          lockVersion: current.lockVersion,
        },
      },
      { refreshOnSuccess: true },
    );

    if (!deleted) return;

    const nextMeetings = meetings.filter((item) => item.id !== meetingId);
    setMeetings(nextMeetings);
    setActiveTab("draft");
    resetWorkspace();
  }

  async function publishMeetingFromRegistry(meetingId: string) {
    if (!workflowAccessGranted) return;

    const current = meetings.find((item) => item.id === meetingId);
    if (!current) return;

    const published = await dispatch(
      {
        type: "meetings.publish",
        houseId,
        payload: {
          id: meetingId,
          lockVersion: current.lockVersion,
          status: "scheduled",
        },
      },
      { refreshOnSuccess: true },
    );

    if (!published) return;

    const publishedRecord = published as Record<string, unknown>;
    const nextMeetings = meetings.map((item) =>
      item.id === meetingId
        ? {
            ...item,
            status: "scheduled" as MeetingLifecycleStatus,
            lifecycleStatus: "published" as const,
            lockVersion:
              typeof publishedRecord.lock_version === "number"
                ? publishedRecord.lock_version
                : item.lockVersion + 1,
            updatedAt: String(publishedRecord.updated_at ?? item.updatedAt),
          }
        : item,
    );

    setMeetings(nextMeetings);
    setActiveTab("active");
    resetWorkspace();
  }

  async function archiveMeetingFromRegistry(meetingId: string) {
    if (!workflowAccessGranted) return;

    const current = meetings.find((item) => item.id === meetingId);
    if (!current) return;

    const archived = await dispatch(
      {
        type: "meetings.archive",
        houseId,
        payload: {
          id: meetingId,
          lockVersion: current.lockVersion,
        },
      },
      { refreshOnSuccess: true },
    );

    if (!archived) return;

    const archivedRecord = archived as Record<string, unknown>;
    const nextMeetings = meetings.map((item) =>
      item.id === meetingId
        ? {
            ...item,
            status: "archived" as MeetingLifecycleStatus,
            lifecycleStatus: "archived" as const,
            lockVersion:
              typeof archivedRecord.lock_version === "number"
                ? archivedRecord.lock_version
                : item.lockVersion + 1,
            updatedAt: String(archivedRecord.updated_at ?? item.updatedAt),
          }
        : item,
    );

    setMeetings(nextMeetings);
    setActiveTab("archived");
    resetWorkspace();
  }

  return (
    <div className={`${adminSurfaceClass} p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            Збори
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cms-text-muted)]">
            Керуйте зборами будинку, порядком денним, етапами голосування та підсумковими рішеннями в єдиному робочому просторі.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode}
            className={adminButtonClasses({ variant: "primary" })}
          >
            Нові збори
          </button>

        </div>
      </div>

      <div className="mt-6">
        <AdminSegmentedTabs
          activeKey={activeTab}
          onChange={(key) => handleTabChange(key as WorkspaceTab)}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: counters[tab.key],
          }))}
        />
      </div>

      <AdminSidePanel
        title={mode === "create" ? "Нові збори" : "Редагування зборів"}
        description={
          mode === "edit" ? (
            <div className="flex flex-wrap items-center gap-3">
              <AdminStatusBadge tone={statusToneFor(draft.status)}>
                {statusLabelFor(draft.status)}
              </AdminStatusBadge>
              <span>{formatDate(draft.meetingDateTime)}</span>
            </div>
          ) : (
            "Нові збори спочатку зберігаються як чернетка."
          )
        }
        isOpen={mode !== "idle"}
        onClose={closeWorkspace}
        maxWidthClassName="max-w-4xl"
        footer={
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex flex-wrap gap-3">
                {mode === "edit" && draft.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("delete")}
                    className={adminButtonClasses({ variant: "danger" })}
                  >
                    Видалити
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => saveDraftToRegistry()}
                  disabled={isPending}
                  className={`${adminButtonClasses({ variant: "primary" })} disabled:opacity-60`}
                >
                  Зберегти
                </button>

              </div>

              <div className="flex flex-wrap gap-3">
                {mode === "edit" && draft.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => setConfirmAction("publish")}
                    disabled={isPending}
                    className={adminButtonClasses({ variant: "success" })}
                  >
                    Опублікувати
                  </button>
                ) : null}

                {mode === "edit" &&
                draft.status !== "draft" &&
                draft.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMeetingId) {
                        archiveMeetingFromRegistry(selectedMeetingId);
                      }
                    }}
                    disabled={isPending}
                    className={adminButtonClasses({ variant: "secondary" })}
                  >
                    В архів
                  </button>
                ) : null}
              </div>
            </div>
        }
      >
        <div onChange={markDirty} className="space-y-4">
          <details
            open
            className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4"
          >
            <summary className="cursor-pointer text-base font-semibold text-[var(--cms-text)]">
              Основне
            </summary>
            <div className="mt-4 space-y-4">
          {mode === "edit" &&
          draft.status !== "draft" &&
          draft.status !== "archived" ? (
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--cms-text)]">
                Статус після збереження
              </div>
              <div className="flex flex-wrap gap-2">
                {scheduledStatusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        status: option.value,
                      }));
                      markDirty();
                    }}
                    className={adminButtonClasses({
                      variant:
                        draft.status === option.value ? "primary" : "secondary",
                    })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
            <input
              disabled={isContentLocked || isPending}
              value={draft.title}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Назва зборів"
              className={adminInputClass}
            />

            <textarea
              disabled={isContentLocked || isPending}
              value={draft.shortDescription}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  shortDescription: e.target.value,
                }))
              }
              placeholder="Короткий опис"
              rows={4}
              className={adminInputClass}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                  Дата зборів
                </span>
                <input
                  type="date"
                  disabled={isContentLocked || isPending}
                  value={meetingDateInput}
                  onChange={(e) => setMeetingDateInput(e.target.value)}
                  className={adminInputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                  Час зборів
                </span>
                <input
                  type="time"
                  disabled={isContentLocked || isPending}
                  value={meetingTimeInput}
                  onChange={(e) => setMeetingTimeInput(e.target.value)}
                  className={adminInputClass}
                />
              </label>
            </div>

            <input
              disabled={isContentLocked || isPending}
              value={draft.location}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder="Місце проведення"
              className={adminInputClass}
            />
            </div>
          </details>

          <details
            open
            className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4"
          >
            <summary className="cursor-pointer text-base font-semibold text-[var(--cms-text)]">
              Порядок денний
            </summary>
            <div className="mt-4">
            {draft.status !== "review" && draft.status !== "completed" ? (
              <div className="border-t border-[var(--cms-border)] pt-4">
              <div className="mb-3 text-sm font-semibold text-[var(--cms-text)]">
                Порядок денний / питання
              </div>

              <div className="space-y-3">
                {draft.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
                  >
                    <input
                      value={question.title}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          questions: prev.questions.map((q) =>
                            q.id === question.id
                              ? { ...q, title: e.target.value }
                              : q,
                          ),
                        }))
                      }
                      disabled={isContentLocked || isPending}
                      placeholder={`Питання ${index + 1}`}
                      className="w-full rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-sm text-[var(--cms-text)] disabled:opacity-60"
                    />

                    <textarea
                      value={question.description}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          questions: prev.questions.map((q) =>
                            q.id === question.id
                              ? { ...q, description: e.target.value }
                              : q,
                          ),
                        }))
                      }
                      rows={3}
                      disabled={isContentLocked || isPending}
                      placeholder="Опис питання"
                      className="mt-3 w-full rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-sm text-[var(--cms-text)] disabled:opacity-60"
                    />

                    {mode === "edit" &&
                    (draft.status === "review" ||
                      draft.status === "completed") ? (() => {
                      const totalVotes = apartments.length;
                      const votedApartments = (draft.manualVotes ?? []).length;

                      const votesFor = (draft.manualVotes ?? []).filter((vote) =>
                        vote.answers.some(
                          (answer) =>
                            answer.questionId === question.id &&
                            answer.choice === "for",
                        ),
                      ).length;

                      const votesAgainst = (draft.manualVotes ?? []).filter(
                        (vote) =>
                          vote.answers.some(
                            (answer) =>
                              answer.questionId === question.id &&
                              answer.choice === "against",
                          ),
                      ).length;

                      const votesAbstained = (draft.manualVotes ?? []).filter(
                        (vote) =>
                          vote.answers.some(
                            (answer) =>
                              answer.questionId === question.id &&
                              answer.choice === "abstained",
                          ),
                      ).length;

                      const forPercent =
                        totalVotes > 0
                          ? Math.round((votesFor / totalVotes) * 100)
                          : 0;

                      const againstPercent =
                        totalVotes > 0
                          ? Math.round((votesAgainst / totalVotes) * 100)
                          : 0;

                      const abstainedPercent =
                        totalVotes > 0
                          ? Math.round((votesAbstained / totalVotes) * 100)
                          : 0;

                      const outcome =
                        totalVotes === 0
                          ? "Немає даних"
                          : votesFor > votesAgainst
                            ? "Прийнято"
                            : "Не прийнято";

                      return (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              За: {votesFor} ({forPercent}%)
                            </div>
                            <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Проти: {votesAgainst} ({againstPercent}%)
                            </div>
                            <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Утрималися: {votesAbstained} ({abstainedPercent}%)
                            </div>
                            <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Проголосувало квартир: {votedApartments} / {totalVotes}
                            </div>
                          </div>

                          <div className="rounded-[var(--r-md)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--cms-text)]">
                            Підсумок: {outcome}
                          </div>
                        </div>
                      );
                    })() : null}

                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      disabled={
                        isContentLocked ||
                        draft.questions.length <= 1 ||
                        isPending
                      }
                      className="mt-3 text-xs text-[var(--cms-danger-text)] disabled:opacity-40"
                    >
                      Видалити питання
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addQuestion}
                disabled={isPending}
                className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] px-4 py-2 text-sm text-[var(--cms-text)]"
              >
                Додати питання
              </button>
            </div>
            ) : null}
            </div>
          </details>

          <details
            open={draft.status === "review"}
            className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4"
          >
            <summary className="cursor-pointer text-base font-semibold text-[var(--cms-text)]">
              Голоси
            </summary>
            <div className="mt-4">
            {mode === "edit" && draft.status === "review" ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] p-4">
                <div className="text-sm font-semibold text-[var(--cms-text)]">
                  Ручне внесення голосів
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--cms-text-muted)]">
                  Внесіть повний голос квартири за всіма питаннями. Після збереження запис з’явиться у списку нижче.
                </p>

                <div className="mt-4 space-y-4">
                  <select
                    value={selectedApartmentVote}
                    onChange={(e) =>
                      setSelectedApartmentVote(e.target.value)
                    }
                    className={adminInputClass}
                  >
                    <option value="">Оберіть квартиру</option>
                    {availableVotingApartments.map((apartment) => (
                      <option key={apartment.id} value={apartment.id}>
                        {formatApartmentVoteLabel(apartment)}
                      </option>
                    ))}
                  </select>

                  {draft.questions.map((question, index) => (
                    <div
                      key={`manual-${question.id}`}
                      className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
                    >
                      <div className="text-sm font-medium text-[var(--cms-text)]">
                        {question.title || `Питання ${index + 1}`}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          ["for", "За"],
                          ["against", "Проти"],
                          ["abstained", "Утримався"],
                        ].map(([value, label]) => (
                          <button
                            key={`${question.id}-${value}`}
                            type="button"
                            onClick={() =>
                              setManualVoteAnswers((prev) => ({
                                ...prev,
                                [question.id]: value as ManualVoteChoice,
                              }))
                            }
                            className={`rounded-[var(--r-md)] border px-3 py-2 text-xs transition ${
                              manualVoteAnswers[question.id] === value
                                ? "border-[var(--cms-border-strong)] bg-[var(--cms-primary)] text-[var(--cms-primary-contrast)]"
                                : "border-[var(--cms-border)] text-[var(--cms-text-muted)]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={async () => {
                      const isComplete = draft.questions.every(
                        (question) => manualVoteAnswers[question.id],
                      );

                      if (!selectedApartmentVote || !isComplete) {
                        setWorkspaceError("Заповніть квартиру та всі відповіді.");
                        return;
                      }

                      const selectedApartment = availableVotingApartments.find(
                        (apartment) => apartment.id === selectedApartmentVote,
                      );

                      if (!selectedApartment) {
                        setWorkspaceError("Оберіть квартиру зі списку.");
                        return;
                      }

                      setWorkspaceError(null);

                      const nextVote: ManualVoteEntry = {
                        apartmentId: selectedApartment.id,
                        apartmentLabel: selectedApartment.apartmentLabel,
                        submittedAt: new Date().toISOString(),
                        answers: draft.questions.map((question) => ({
                          questionId: question.id,
                          choice: manualVoteAnswers[question.id],
                        })),
                      };

                      const recorded = await dispatch(
                        {
                          type: "meetings.recordManualVote",
                          houseId,
                          payload: {
                            id: draft.id,
                            lockVersion: draft.lockVersion,
                            apartmentId: selectedApartment.id,
                            answers: nextVote.answers,
                          },
                        },
                        { refreshOnSuccess: true },
                      );

                      if (!recorded) return;

                      const recordedSnapshot = recorded as Record<string, unknown>;
                      const recordedMeeting = recordedSnapshot.meeting as
                        | Record<string, unknown>
                        | undefined;

                      const nextLockVersion =
                        typeof recordedMeeting?.lock_version === "number"
                          ? recordedMeeting.lock_version
                          : draft.lockVersion + 1;

                      setDraft((prev) =>
                        recalculateMeetingQuestionResults(
                          {
                            ...prev,
                            lockVersion: nextLockVersion,
                            manualVotes: [...(prev.manualVotes ?? []), nextVote],
                          },
                          apartments.length,
                        ),
                      );

                      setMeetings((prevMeetings) =>
                        prevMeetings.map((meeting) =>
                          meeting.id === draft.id
                            ? recalculateMeetingQuestionResults(
                                {
                                  ...meeting,
                                  lockVersion: nextLockVersion,
                                  manualVotes: [
                                    ...(meeting.manualVotes ?? []),
                                    nextVote,
                                  ],
                                },
                                apartments.length,
                              )
                            : meeting,
                        ),
                      );

                      setSelectedApartmentVote("");
                      setManualVoteAnswers({});
                    }}
                    disabled={isPending}
                    className={adminButtonClasses({ variant: "success" })}
                  >
                    Зберегти голос квартири
                  </button>

                  {(draft.manualVotes ?? []).length > 0 ? (
                    <div className="space-y-3 border-t border-[var(--cms-border)] pt-4">
                      <div className="text-sm font-semibold text-[var(--cms-text)]">
                        Уже внесені голоси
                      </div>

                      {(draft.manualVotes ?? []).map((vote) => (
                        <div
                          key={`${getMeetingApartmentKey(
                            vote.apartmentLabel,
                          )}-${vote.apartmentId}`}
                          className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
                        >
                          <div className="text-sm font-medium text-[var(--cms-text)]">
                            {formatRecordedApartmentVoteLabel(vote, apartments)}
                          </div>

                          <div className="text-xs text-[var(--cms-text-muted)]">
                            {vote.answers
                              .map((answer) =>
                                answer.choice === "for"
                                  ? "За"
                                  : answer.choice === "against"
                                    ? "Проти"
                                    : "Утримався",
                              )
                              .join(" / ")}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) =>
                                recalculateMeetingQuestionResults(
                                  {
                                    ...prev,
                                    manualVotes: (prev.manualVotes ?? []).filter(
                                      (entry) =>
                                        getMeetingApartmentKey(
                                          entry.apartmentLabel,
                                        ) !==
                                        getMeetingApartmentKey(
                                          vote.apartmentLabel,
                                        ),
                                    ),
                                  },
                                  apartments.length,
                                ),
                              )
                            }
                            className="text-sm text-[var(--cms-danger-text)]"
                          >
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            </div>
          </details>
        </div>
      </AdminSidePanel>

      {!hasApartments ? (
        <EmptyState
          title="Для голосування немає квартир"
          description="Спочатку додайте квартири цього будинку. Після цього можна буде створювати збори та фіксувати голоси."
          action={
            <Link
              href="/admin/apartments"
              className={adminButtonClasses({ variant: "primary" })}
            >
              Перейти до квартир
            </Link>
          }
        />
      ) : null}

      <div
        className={[
          "mt-6 grid gap-4",
          viewMode === "grid" ? "md:grid-cols-2" : "grid-cols-1",
        ].join(" ")}
      >
        <WorkspaceListToolbar
          className="col-span-full"
          searchQuery={searchQuery}
          sortMode={sortMode}
          visible={visibleCount}
          total={visibleMeetings.length}
          searchPlaceholder="Назва або текст зборів"
          onSearchChange={(value) => {
            setSearchQuery(value);
            setVisibleCount(20);
          }}
          onSortChange={(value) => {
            setSortMode(value);
            setVisibleCount(20);
          }}
          onShowMore={() => setVisibleCount((current) => current + 20)}
          trailingControls={<WorkspaceViewToggle value={viewMode} onChange={setViewMode} />}
        />

        {visibleMeetings.length === 0 ? (
          <EmptyState
            title={activeTab === "draft" ? "Чернеток поки немає" : String(activeTab).startsWith("archiv") ? "Архів зборів поки порожній" : "Активних зборів поки немає"}
            description={activeTab === "draft" ? "Створіть нові збори — вони з’являться тут як чернетка." : String(activeTab).startsWith("archiv") ? "Тут зберігатимуться завершені записи для історії будинку." : "Після підтвердження чернетки збори з’являться тут."}
            action={!String(activeTab).startsWith("archiv") ? (
              <button type="button" data-workspace-create-action="true"
              title="Створити (N)"
              onClick={openCreateMode} className={adminButtonClasses({ variant: "primary" })}>Створити збори</button>
            ) : undefined}
          />
        ) : (
          visibleMeetings.slice(0, visibleCount).map((meeting) => (
            <article
              key={meeting.id}
              onClick={() => openEditMode(meeting)}
              className="relative cursor-pointer rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 pr-16 transition hover:border-[var(--cms-border-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--cms-text)]">
                  {meeting.title || "Без назви"}
                </div>
                <AdminStatusBadge tone={statusToneFor(meeting.status)}>
                  {statusLabelFor(meeting.status)}
                </AdminStatusBadge>
              </div>
              <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                {formatDate(meeting.meetingDateTime)}
              </div>
              <div className="mt-3 text-sm text-[var(--cms-text-soft)]">
                {meeting.questions.length} питань · Не брали участь: {formatNotParticipatingApartments(meeting, apartments)}
              </div>

              <div>
                <WorkspaceQuickActions
                  actions={[
                    ...(meeting.lifecycleStatus === "draft"
                      ? [
                          ...(workflowAccessGranted
                            ? [
                                {
                                  key: "publish",
                                  label: "Опублікувати",
                                  onSelect: () =>
                                    prepareQuickAction(meeting, "publish"),
                                },
                              ]
                            : []),
                          {
                            key: "delete",
                            label: "Видалити",
                            tone: "danger" as const,
                            onSelect: () =>
                              prepareQuickAction(meeting, "delete"),
                          },
                        ]
                      : []),
                    ...(meeting.lifecycleStatus === "published" &&
                    workflowAccessGranted
                      ? [
                          {
                            key: "archive",
                            label: "В архів",
                            onSelect: () =>
                              prepareQuickAction(meeting, "archive"),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </article>
          ))
        )}
      </div>

      {workspaceError ? (
        <div
          role="alert"
          className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
        >
          {workspaceError}
        </div>
      ) : null}

      <PlatformConfirmModal
        open={dirtyGuard.confirmOpen}
        title="Є незбережені зміни"
        description="Якщо продовжити, внесені зміни буде втрачено."
        confirmLabel="Вийти без збереження"
        cancelLabel="Продовжити редагування"
        tone="warning"
        onCancel={dirtyGuard.cancel}
        onConfirm={dirtyGuard.discardAndContinue}
      />

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        tone="destructive"
        title="Видалити чернетку зборів?"
        description="Чернетку буде видалено без можливості відновлення."
        confirmLabel="Видалити"
        pendingLabel="Видаляємо..."
        isPending={isPending}
        onConfirm={() => {
          if (selectedMeetingId) {
            deleteMeetingFromRegistry(selectedMeetingId);
          }
        }}
        onCancel={() => {
          if (!isPending) {
            setConfirmAction(null);
          }
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        tone="warning"
        title="Перенести збори до архіву?"
        description="Збори буде знято з публікації та переміщено до архіву."
        confirmLabel="В архів"
        pendingLabel="Архівуємо..."
        isPending={isPending}
        onConfirm={() => {
          if (selectedMeetingId) {
            void archiveMeetingFromRegistry(selectedMeetingId);
          }
        }}
        onCancel={() => {
          if (!isPending) {
            setConfirmAction(null);
          }
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        tone="publish"
        title="Підтвердити збори?"
        description="Збори буде переміщено з чернеток до активних."
        confirmLabel="Підтвердити"
        pendingLabel="Підтверджуємо..."
        isPending={isPending}
        onConfirm={() => {
          if (selectedMeetingId) {
            publishMeetingFromRegistry(selectedMeetingId);
          }
        }}
        onCancel={() => {
          if (!isPending) {
            setConfirmAction(null);
          }
        }}
      />
    </div>
  );
}
