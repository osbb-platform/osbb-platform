"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";

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
  { key: "active", label: "Активные" },
  { key: "draft", label: "Черновики" },
  { key: "archived", label: "Архив" },
];

const scheduledStatusOptions: Array<{
  value: MeetingLifecycleStatus;
  label: string;
}> = [
  { value: "scheduled", label: "Запланировано" },
  { value: "active", label: "Голосование" },
  { value: "review", label: "На проверке" },
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
  if (!value) return "Дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return date.toLocaleString("ru-RU");
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
  if (status === "draft") return "Черновик";
  if (status === "scheduled") return "Запланировано";
  if (status === "active") return "Голосование";
  if (status === "review") return "Проверка";
  if (status === "completed") return "Решение";
  return "Архив";
}

function getMeetingStatusBadgeClasses(status: MeetingLifecycleStatus) {
  if (status === "draft") return "border border-slate-700 bg-slate-900 text-slate-300";
  if (status === "scheduled") return "border border-blue-900 bg-blue-950/40 text-blue-300";
  if (status === "active") return "border border-emerald-900 bg-emerald-950/40 text-emerald-300";
  if (status === "review") return "border border-violet-900 bg-violet-950/40 text-violet-300";
  if (status === "completed") return "border border-amber-900 bg-amber-950/40 text-amber-300";
  return "border border-slate-700 bg-slate-950 text-slate-400";
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
        "Сначала заполните раздел «Квартиры» для этого дома. Без списка квартир невозможно создать собрание и запустить голосование.",
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
      formData.set("title", section.title ?? "Собрания");
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
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Собрания
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Управляйте собраниями дома, повесткой, этапами голосования и итоговыми решениями в едином рабочем пространстве.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={openCreateMode}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950"
          >
            Новое собрание
          </button>

        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = counters[tab.key];

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-slate-950 shadow-sm"
                  : "border border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-slate-950/10 text-slate-700"
                    : "bg-slate-900 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {mode !== "idle" ? (
        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="text-lg font-semibold text-white">
              {mode === "create" ? "Новое собрание" : "Редактирование"}
            </div>

            {mode !== "idle" ? (
              <button
                type="button"
                onClick={closeWorkspace}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg text-slate-300 transition hover:border-slate-500 hover:text-white"
                aria-label="Закрыть форму"
              >
                ×
              </button>
            ) : null}
          </div>

          {mode === "edit" &&
          draft.status !== "draft" &&
          draft.status !== "archived" ? (
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-white">
                Статус после сохранения
              </span>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: e.target.value as MeetingLifecycleStatus,
                  }))
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
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
              placeholder="Название собрания"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
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
              placeholder="Краткое описание"
              rows={4}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">
                  Дата собрания
                </span>
                <input
                  type="date"
                  disabled={isContentLocked || isPending}
                  value={meetingDateInput}
                  onChange={(e) => setMeetingDateInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white">
                  Время собрания
                </span>
                <input
                  type="time"
                  disabled={isContentLocked || isPending}
                  value={meetingTimeInput}
                  onChange={(e) => setMeetingTimeInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
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
              placeholder="Место проведения"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500"
            />

            {mode === "edit" && draft.status === "review" ? (
              <div className="rounded-2xl border border-violet-900/40 bg-violet-950/10 p-4">
                <div className="text-sm font-semibold text-white">
                  Ручной ввод голосов
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Внесите полный голос квартиры по всем вопросам. После сохранения запись появится в списке ниже.
                </p>

                <div className="mt-4 space-y-4">
                  <select
                    value={selectedApartmentVote}
                    onChange={(e) =>
                      setSelectedApartmentVote(e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white"
                  >
                    <option value="">Выберите квартиру</option>
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
                      className="rounded-2xl border border-slate-800 p-4"
                    >
                      <div className="text-sm font-medium text-white">
                        {question.title || `Вопрос ${index + 1}`}
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {[
                          ["for", "За"],
                          ["against", "Против"],
                          ["abstained", "Воздержался"],
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
                                ? "border-white bg-white text-slate-950"
                                : "border-slate-700 text-slate-300"
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
                        window.alert("Заполните квартиру и все ответы.");
                        return;
                      }

                      const selectedApartment = availableVotingApartments.find(
                        (apartment) => apartment.id === selectedApartmentVote,
                      );

                      if (!selectedApartment) {
                        window.alert("Выберите квартиру из списка.");
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
                    className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm font-medium text-emerald-300"
                  >
                    Сохранить голос квартиры
                  </button>

                  {(draft.manualVotes ?? []).length > 0 ? (
                    <div className="space-y-3 border-t border-slate-800 pt-4">
                      <div className="text-sm font-semibold text-white">
                        Уже внесенные голоса
                      </div>

                      {(draft.manualVotes ?? []).map((vote) => (
                        <div
                          key={vote.apartmentId}
                          className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-3 rounded-2xl border border-slate-800 p-4"
                        >
                          <div className="text-sm font-medium text-white">
                            {vote.apartmentLabel}
                          </div>

                          <div className="text-xs text-slate-400">
                            {vote.answers
                              .map((answer) =>
                                answer.choice === "for"
                                  ? "За"
                                  : answer.choice === "against"
                                    ? "Против"
                                    : "Воздержался",
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
              <div className="border-t border-slate-800 pt-4">
              <div className="mb-3 text-sm font-semibold text-white">
                Повестка / вопросы
              </div>

              <div className="space-y-3">
                {draft.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-800 p-4"
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
                      placeholder={`Вопрос ${index + 1}`}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
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
                      placeholder="Описание вопроса"
                      className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
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
                          ? "Нет данных"
                          : votesFor > votesAgainst
                            ? "Принято"
                            : "Не принято";

                      return (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                              За: {votesFor} ({forPercent}%)
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                              Против: {votesAgainst} ({againstPercent}%)
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                              Воздержались: {votesAbstained} ({abstainedPercent}%)
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                              Квартир: {totalVotes}
                            </div>
                          </div>

                          <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 px-3 py-2 text-xs font-medium text-violet-200">
                            Итог: {outcome}
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
                      Удалить вопрос
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addQuestion}
                disabled={isPending}
                className="mt-4 rounded-2xl border border-slate-700 px-4 py-2 text-sm text-white"
              >
                Добавить вопрос
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
                        window.confirm("Удалить черновик собрания без возможности восстановления?")
                      ) {
                        deleteMeetingFromRegistry(selectedMeetingId);
                      }
                    }}
                    className="rounded-2xl border border-rose-500/30 px-4 py-3 text-sm font-medium text-rose-300"
                  >
                    Удалить
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => saveDraftToRegistry()}
                  disabled={isPending}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-950 disabled:opacity-60"
                >
                  Сохранить
                </button>

              </div>

              <div className="flex flex-wrap gap-3">
                {mode === "edit" && draft.status === "draft" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Подтвердить собрание и переместить его в активные?")) {
                        saveDraftToRegistry("scheduled");
                      }
                    }}
                    disabled={isPending}
                    className="rounded-2xl border border-emerald-500/30 px-4 py-3 text-sm font-medium text-emerald-300 disabled:opacity-60"
                  >
                    Подтвердить
                  </button>
                ) : null}

                {mode === "edit" &&
                draft.status !== "draft" &&
                draft.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => saveDraftToRegistry("archived")}
                    disabled={isPending}
                    className="rounded-2xl border border-amber-500/30 px-4 py-3 text-sm font-medium text-amber-300 disabled:opacity-60"
                  >
                    Архивировать
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {visibleMeetings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-6">
            <div className="text-base font-semibold text-white">
              {activeTab === "draft"
                ? "Черновиков пока нет"
                : activeTab === "archived"
                  ? "Архив собраний пока пуст"
                  : "Активных собраний пока нет"}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {activeTab === "draft"
                ? "Создайте новое собрание — оно появится здесь как черновик, пока вы не подтвердите публикацию."
                : activeTab === "archived"
                  ? "После завершения работы собрания можно будет перенести в архив. Здесь будут храниться завершенные записи для истории дома."
                  : "После подтверждения черновика собрание появится здесь. В этой вкладке собираются все этапы работы: запланировано, голосование, на проверке и завершено."}
            </p>
          </div>
        ) : (
          visibleMeetings.map((meeting) => (
            <article
              key={meeting.id}
              onClick={() => openEditMode(meeting)}
              className="cursor-pointer rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold text-white">
                  {meeting.title || "Без названия"}
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${getMeetingStatusBadgeClasses(
                    meeting.status,
                  )}`}
                >
                  {getMeetingStatusLabel(meeting.status)}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {formatDate(meeting.meetingDateTime)}
              </div>
              <div className="mt-3 text-sm text-slate-500">
                {meeting.questions.length} вопросов
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
