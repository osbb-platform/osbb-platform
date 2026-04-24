"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";

type SectionStatus = "draft" | "in_review" | "published" | "archived";
type MeetingLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

type WorkspaceMode = "idle" | "create" | "edit";

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
  section: {
    id: string;
    title: string | null;
    status: SectionStatus;
    content: Record<string, unknown>;
  };
};

const initialState = { error: null };

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
    protocolPdf: "",
    protocolDocumentId: "",
    questions: [createQuestion(0)],
  };
}

function normalizeMeetings(content: Record<string, unknown>): MeetingItem[] {
  const rawItems = Array.isArray(content.items) ? content.items : [];

  return rawItems.map((item, index) => {
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

function getMeetingStatusLabel(status: MeetingLifecycleStatus) {
  if (status === "draft") return "Чернетка";
  if (status === "scheduled") return "Заплановано";
  if (status === "active") return "Голосування";
  if (status === "review") return "Перевірка";
  if (status === "completed") return "Рішення";
  return "Архів";
}

function getMeetingStatusBadgeClasses(status: MeetingLifecycleStatus) {
  if (status === "draft") return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] text-[var(--cms-text-muted)]";
  if (status === "scheduled") return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]";
  if (status === "active") return "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]";
  if (status === "review") return "border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)]";
  if (status === "completed") return "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]";
  return "border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text-muted)]";
}

function combineMeetingDateTime(date: string, time: string) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}

export function HouseMeetingsWorkspace({
  houseId,
  houseSlug,
  hasApartments,
  apartments,
  section,
  canChangeWorkflowStatus,
}: Props) {
  const workflowAccessGranted = Boolean(canChangeWorkflowStatus);
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const [meetings, setMeetings] = useState<MeetingItem[]>(
    normalizeMeetings(section.content),
  );

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");

  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeetingItem>(createEmptyMeeting());
  const [meetingDateInput, setMeetingDateInput] = useState("");
  const [meetingTimeInput, setMeetingTimeInput] = useState("");
  const [selectedApartmentVote, setSelectedApartmentVote] = useState("");
  const [manualVoteAnswers, setManualVoteAnswers] = useState<
    Record<string, ManualVoteChoice>
  >({});

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

  const availableVotingApartments = useMemo(() => {
    const votedApartmentIds = new Set(
      (draft.manualVotes ?? []).map((vote) => vote.apartmentId),
    );

    return apartments.filter(
      (apartment) => !votedApartmentIds.has(apartment.id),
    );
  }, [apartments, draft.manualVotes]);

  const visibleMeetings = useMemo(() => {
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

  const isContentLocked = false;

  function openCreateMode() {
    if (!hasApartments) {
      window.alert(
        "Спочатку заповніть розділ «Квартири» для цього будинку. Без списку квартир неможливо створити збори та запустити голосування.",
      );
      return;
    }

    setMode("create");
    setSelectedMeetingId(null);
    setDraft(createEmptyMeeting());
    setMeetingDateInput("");
    setMeetingTimeInput("");
    setActiveTab("draft");
  }

  function openEditMode(meeting: MeetingItem) {
    const splitDateTime = splitMeetingDateTime(meeting.meetingDateTime);

    setMode("edit");
    setSelectedMeetingId(meeting.id);
    setDraft(meeting);
    setMeetingDateInput(splitDateTime.date);
    setMeetingTimeInput(splitDateTime.time);
  }

  function closeWorkspace() {
    setMode("idle");
    setSelectedMeetingId(null);
    setDraft(createEmptyMeeting());
    setMeetingDateInput("");
    setMeetingTimeInput("");
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

    return {
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
    };
  }

  function persistMeetings(nextMeetings: MeetingItem[]) {
    const payload = {
      items: nextMeetings,
      updatedAt: new Date().toISOString(),
    };

    startTransition(() => {
      const formData = new FormData();
      formData.set("houseId", houseId);
      formData.set("houseSlug", houseSlug);
      formData.set("sectionId", section.id);
      formData.set("kind", "meetings");
      formData.set("title", section.title ?? "Збори");
      formData.set("status", section.status ?? "published");
      formData.set("content", JSON.stringify(payload));
      formAction(formData);
    });
  }

  function saveDraftToRegistry(nextStatus?: MeetingLifecycleStatus) {
    if (nextStatus && !workflowAccessGranted) return;
    const next = buildMeetingForSave(nextStatus);

    const nextMeetings =
      mode === "edit" && selectedMeetingId
        ? meetings.map((item) =>
            item.id === selectedMeetingId ? next : item,
          )
        : [next, ...meetings];

    setMeetings(nextMeetings);
    persistMeetings(nextMeetings);
    setActiveTab(next.status === "archived" ? "archived" : next.status === "draft" ? "draft" : "active");
    closeWorkspace();
  }

  function deleteMeetingFromRegistry(meetingId: string) {
    const nextMeetings = meetings.filter((item) => item.id !== meetingId);
    setMeetings(nextMeetings);
    persistMeetings(nextMeetings);
    setActiveTab("draft");
    closeWorkspace();
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
            onClick={openCreateMode}
            className={adminPrimaryButtonClass}
          >
            Нові збори
          </button>

        </div>
      </div>

      <div className="mt-6">
        <AdminSegmentedTabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as WorkspaceTab)}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: counters[tab.key],
          }))}
        />
      </div>

      {mode !== "idle" ? (
        <div className="mt-6 rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="text-lg font-semibold text-[var(--cms-text)]">
              {mode === "create" ? "Нові збори" : "Редагування"}
            </div>

            <button
              type="button"
              onClick={closeWorkspace}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cms-border-strong)] text-lg text-[var(--cms-text-muted)] transition hover:border-[var(--cms-border-strong)] hover:text-[var(--cms-text)]"
              aria-label="Закрити форму"
            >
              ×
            </button>
          </div>

          {mode === "edit" &&
          draft.status !== "draft" &&
          draft.status !== "archived" ? (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-white">
                Статус після збереження
              </span>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: e.target.value as MeetingLifecycleStatus,
                  }))
                }
                className={adminInputClass}
              >
                {scheduledStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="mt-5 space-y-4">
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
                <span className="mb-2 block text-sm font-medium text-white">
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
                <span className="mb-2 block text-sm font-medium text-white">
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

            {mode === "edit" && draft.status === "review" ? (
              <div className="rounded-2xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] p-4">
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
                        {apartment.ownerName
                          ? `Кв. ${apartment.apartmentLabel} — ${apartment.ownerName}`
                          : `Кв. ${apartment.apartmentLabel}`}
                      </option>
                    ))}
                  </select>

                  {draft.questions.map((question, index) => (
                    <div
                      key={`manual-${question.id}`}
                      className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
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
                            className={`rounded-xl border px-3 py-2 text-xs transition ${
                              manualVoteAnswers[question.id] === value
                                ? "border-[var(--cms-border-strong)] bg-white text-slate-950"
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
                    onClick={() => {
                      const isComplete = draft.questions.every(
                        (question) => manualVoteAnswers[question.id],
                      );

                      if (!selectedApartmentVote || !isComplete) {
                        window.alert("Заповніть квартиру та всі відповіді.");
                        return;
                      }

                      const selectedApartment = availableVotingApartments.find(
                        (apartment) => apartment.id === selectedApartmentVote,
                      );

                      if (!selectedApartment) {
                        window.alert("Оберіть квартиру зі списку.");
                        return;
                      }

                      const nextVote: ManualVoteEntry = {
                        apartmentId: selectedApartment.id,
                        apartmentLabel: selectedApartment.ownerName
                          ? `Кв. ${selectedApartment.apartmentLabel} — ${selectedApartment.ownerName}`
                          : `Кв. ${selectedApartment.apartmentLabel}`,
                        submittedAt: new Date().toISOString(),
                        answers: draft.questions.map((question) => ({
                          questionId: question.id,
                          choice: manualVoteAnswers[question.id],
                        })),
                      };

                      setDraft((prev) => ({
                        ...prev,
                        manualVotes: [...(prev.manualVotes ?? []), nextVote],
                      }));

                      setSelectedApartmentVote("");
                      setManualVoteAnswers({});
                    }}
                    className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm font-medium text-[var(--cms-success-text)]"
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
                          key={vote.apartmentId}
                          className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-3 rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
                        >
                          <div className="text-sm font-medium text-[var(--cms-text)]">
                            {vote.apartmentLabel}
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
                              setDraft((prev) => ({
                                ...prev,
                                manualVotes: (prev.manualVotes ?? []).filter(
                                  (entry) =>
                                    entry.apartmentId !== vote.apartmentId,
                                ),
                              }))
                            }
                            className="text-sm text-rose-400"
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

            {draft.status !== "review" && draft.status !== "completed" ? (
              <div className="border-t border-[var(--cms-border)] pt-4">
              <div className="mb-3 text-sm font-semibold text-white">
                Порядок денний / питання
              </div>

              <div className="space-y-3">
                {draft.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
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
                      className="w-full rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-sm text-[var(--cms-text)] disabled:opacity-60"
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
                      className="mt-3 w-full rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-sm text-[var(--cms-text)] disabled:opacity-60"
                    />

                    {mode === "edit" &&
                    (draft.status === "review" ||
                      draft.status === "completed") ? (() => {
                      const totalVotes = (draft.manualVotes ?? []).length;

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
                            <div className="rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              За: {votesFor} ({forPercent}%)
                            </div>
                            <div className="rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Проти: {votesAgainst} ({againstPercent}%)
                            </div>
                            <div className="rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Утрималися: {votesAbstained} ({abstainedPercent}%)
                            </div>
                            <div className="rounded-xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-xs text-[var(--cms-text-muted)]">
                              Квартир: {totalVotes}
                            </div>
                          </div>

                          <div className="rounded-xl border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--cms-text)]">
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
                      className="mt-3 text-xs text-rose-400 disabled:opacity-40"
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
                className="mt-4 rounded-2xl border border-[var(--cms-border-strong)] px-4 py-2 text-sm text-[var(--cms-text)]"
              >
                Додати питання
              </button>
            </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex flex-wrap gap-3">
                {mode === "edit" && draft.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        selectedMeetingId &&
                        window.confirm("Видалити чернетку зборів без можливості відновлення?")
                      ) {
                        deleteMeetingFromRegistry(selectedMeetingId);
                      }
                    }}
                    className="rounded-2xl border border-rose-500/30 px-4 py-3 text-sm font-medium text-[var(--cms-danger-text)]"
                  >
                    Видалити
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => saveDraftToRegistry()}
                  disabled={isPending}
                  className={`${adminPrimaryButtonClass} disabled:opacity-60`}
                >
                  Зберегти
                </button>

              </div>

              <div className="flex flex-wrap gap-3">
                {mode === "edit" && draft.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Підтвердити збори та перемістити їх в активні?")) {
                        saveDraftToRegistry("scheduled");
                      }
                    }}
                    disabled={isPending}
                    className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm font-medium text-[var(--cms-success-text)] disabled:opacity-60"
                  >
                    Підтвердити
                  </button>
                ) : null}

                {mode === "edit" &&
                draft.status !== "draft" &&
                draft.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => saveDraftToRegistry("archived")}
                    disabled={isPending}
                    className="rounded-2xl border border-amber-500/30 px-4 py-3 text-sm font-medium text-[var(--cms-warning-text)] disabled:opacity-60"
                  >
                    Архівувати
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {visibleMeetings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-6">
            <div className="text-base font-semibold text-[var(--cms-text)]">
              {activeTab === "draft"
                ? "Чернеток поки немає"
                : activeTab === "archived"
                  ? "Архів зборів поки порожній"
                  : "Активних зборів поки немає"}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cms-text-muted)]">
              {activeTab === "draft"
                ? "Створіть нові збори — вони з’являться тут як чернетка, доки ви не підтвердите публікацію."
                : activeTab === "archived"
                  ? "Після завершення роботи збори можна буде перенести в архів. Тут зберігатимуться завершені записи для історії будинку."
                  : "Після підтвердження чернетки збори з’являться тут. У цій вкладці зібрано всі етапи роботи: заплановано, голосування, на перевірці та завершено."}
            </p>
          </div>
        ) : (
          visibleMeetings.map((meeting) => (
            <article
              key={meeting.id}
              onClick={() => openEditMode(meeting)}
              className="cursor-pointer rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-5 transition hover:border-[var(--cms-border-strong)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--cms-text)]">
                  {meeting.title || "Без назви"}
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${getMeetingStatusBadgeClasses(
                    meeting.status,
                  )}`}
                >
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>
              <div className="mt-2 text-sm text-[var(--cms-text-muted)]">
                {formatDate(meeting.meetingDateTime)}
              </div>
              <div className="mt-3 text-sm text-[var(--cms-text-soft)]">
                {meeting.questions.length} питань
              </div>
            </article>
          ))
        )}
      </div>

      {state.error ? (
        <div className="mt-4 text-sm text-red-400">{state.error}</div>
      ) : null}
    </div>
  );
}
