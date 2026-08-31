"use client";

import { formatKyivDateTime } from "@/src/shared/utils/dates/formatKyivDateTime";

import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type {
  HousePollIdentityMode,
  HousePollQuestionType,
  HousePollResultsVisibility,
  HousePollStatus,
} from "@/src/modules/content-engine/v2/handlers/polls";
import type {
  AdminHousePollSnapshot,
  AdminHousePollsSnapshot,
  AdminPollQuestionSnapshot,
} from "@/src/modules/houses/services/getAdminHousePolls";
import { AdminSegmentedTabs } from "@/src/shared/ui/admin/AdminSegmentedTabs";
import { AdminSidePanel } from "@/src/shared/ui/admin/AdminSidePanel";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";
import {
  adminButtonClasses,
  adminInputClass,
  adminSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type WorkspaceMode = "idle" | "create" | "edit";
type WorkspaceTab = "active" | "draft" | "archived";
type PollLifecycleStatus = "draft" | "published" | "archived";

type PollDraftOption = {
  id: string;
  label: string;
};

type PollDraftQuestion = {
  id: string;
  question: string;
  description: string;
  questionType: HousePollQuestionType;
  scaleMax: 5 | 10;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  isRequired: boolean;
  options: PollDraftOption[];
};

type PollDraft = {
  id: string;
  title: string;
  description: string;
  identityMode: HousePollIdentityMode;
  resultsVisibility: HousePollResultsVisibility;
  pollStatus: HousePollStatus;
  lifecycleStatus: PollLifecycleStatus;
  lockVersion: number;
  questions: PollDraftQuestion[];
  participationCount: number;
};

type Props = {
  houseId: string;
  houseSlug: string;
  polls: AdminHousePollsSnapshot;
  canPublish: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDelete: boolean;
};

const tabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "active", label: "Опубліковані" },
  { key: "draft", label: "Чернетки" },
  { key: "archived", label: "Архів" },
];

const questionTypeOptions: Array<{
  value: HousePollQuestionType;
  label: string;
}> = [
  { value: "single_choice", label: "Один варіант" },
  { value: "multiple_choice", label: "Кілька варіантів" },
  { value: "yes_no", label: "Так / Ні" },
  { value: "scale", label: "Шкала" },
  { value: "free_text", label: "Вільна відповідь" },
];

const INITIAL_POLL_ID = "poll-00000000-0000-4000-8000-000000000000";

function createClientId(
  prefix: string,
  options?: { deterministic?: boolean; index?: number },
) {
  if (options?.deterministic) {
    const suffix = String(options.index ?? 0).padStart(12, "0");
    return `${prefix}-00000000-0000-4000-8000-${suffix}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createOption(
  label = "",
  options?: { deterministic?: boolean; index?: number },
): PollDraftOption {
  return {
    id: createClientId("option", options),
    label,
  };
}

function createQuestion(
  questionType: HousePollQuestionType = "single_choice",
  options?: { deterministic?: boolean; index?: number },
): PollDraftQuestion {
  const deterministic = options?.deterministic ?? false;

  return {
    id: createClientId("question", {
      deterministic,
      index: options?.index,
    }),
    question: "",
    description: "",
    questionType,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    isRequired: true,
    options:
      questionType === "single_choice" || questionType === "multiple_choice"
        ? [
            createOption("", { deterministic, index: 1 }),
            createOption("", { deterministic, index: 2 }),
          ]
        : [],
  };
}

function createEmptyPoll(options?: { deterministic?: boolean }): PollDraft {
  const deterministic = options?.deterministic ?? false;

  return {
    id: deterministic ? INITIAL_POLL_ID : createClientId("poll"),
    title: "",
    description: "",
    identityMode: "open",
    resultsVisibility: "after_completion",
    pollStatus: "idle",
    lifecycleStatus: "draft",
    lockVersion: 1,
    questions: [
      createQuestion("single_choice", {
        deterministic,
        index: 1,
      }),
    ],
    participationCount: 0,
  };
}

function mapQuestion(question: AdminPollQuestionSnapshot): PollDraftQuestion {
  return {
    id: question.id,
    question: question.question,
    description: question.description,
    questionType: question.questionType,
    scaleMax: question.scaleMax === 10 ? 10 : 5,
    scaleMinLabel: question.scaleMinLabel,
    scaleMaxLabel: question.scaleMaxLabel,
    isRequired: question.isRequired,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  };
}

function mapPoll(item: AdminHousePollSnapshot): PollDraft {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    identityMode: item.identityMode,
    resultsVisibility: item.resultsVisibility,
    pollStatus: item.pollStatus,
    lifecycleStatus: item.lifecycleStatus,
    lockVersion: item.lockVersion,
    questions: item.questions.map(mapQuestion),
    participationCount: item.results?.participationCount ?? 0,
  };
}

function normalizeReturnedPoll(value: unknown, fallback: PollDraft): PollDraft {
  const record = (value ?? {}) as Record<string, unknown>;

  const identity =
    record.identity_mode === "anonymous" || record.identityMode === "anonymous"
      ? "anonymous"
      : record.identity_mode === "open" || record.identityMode === "open"
        ? "open"
        : fallback.identityMode;

  const visibility =
    record.results_visibility === "immediate" || record.resultsVisibility === "immediate"
      ? "immediate"
      : record.results_visibility === "hidden" || record.resultsVisibility === "hidden"
        ? "hidden"
        : record.results_visibility === "after_completion" ||
            record.resultsVisibility === "after_completion"
          ? "after_completion"
          : fallback.resultsVisibility;

  const pollStatus =
    record.poll_status === "active" || record.pollStatus === "active"
      ? "active"
      : record.poll_status === "completed" || record.pollStatus === "completed"
        ? "completed"
        : record.poll_status === "idle" || record.pollStatus === "idle"
          ? "idle"
          : fallback.pollStatus;

  const lifecycle =
    record.lifecycle_status === "published" || record.lifecycleStatus === "published"
      ? "published"
      : record.lifecycle_status === "archived" || record.lifecycleStatus === "archived"
        ? "archived"
        : record.lifecycle_status === "draft" || record.lifecycleStatus === "draft"
          ? "draft"
          : fallback.lifecycleStatus;

  return {
    ...fallback,
    id: String(record.id ?? fallback.id),
    title: String(record.title ?? fallback.title),
    description: String(record.description ?? fallback.description),
    identityMode: identity,
    resultsVisibility: visibility,
    pollStatus,
    lifecycleStatus: lifecycle,
    lockVersion:
      typeof record.lock_version === "number"
        ? record.lock_version
        : typeof record.lockVersion === "number"
          ? record.lockVersion
          : fallback.lockVersion + 1,
  };
}

function questionTypeLabel(value: HousePollQuestionType) {
  return questionTypeOptions.find((item) => item.value === value)?.label ?? value;
}

function identityLabel(value: HousePollIdentityMode) {
  return value === "anonymous" ? "Анонімне" : "Відкрите";
}

function visibilityLabel(value: HousePollResultsVisibility) {
  if (value === "immediate") return "Одразу після відповіді";
  if (value === "hidden") return "Приховані від мешканців";
  return "Після завершення";
}

function statusLabel(poll: {
  lifecycleStatus: PollLifecycleStatus;
  pollStatus: HousePollStatus;
}) {
  if (poll.lifecycleStatus === "archived") return "Архів";
  if (poll.lifecycleStatus === "draft") return "Чернетка";
  if (poll.pollStatus === "active") return "Триває";
  if (poll.pollStatus === "completed") return "Завершено";
  return "Опубліковано";
}

function formatDateTime(value: string) {
  return formatKyivDateTime(value);
}

function questionPayload(question: PollDraftQuestion, index: number) {
  return {
    question: question.question.trim(),
    description: question.description.trim(),
    questionType: question.questionType,
    scaleMax: question.questionType === "scale" ? question.scaleMax : null,
    scaleMinLabel:
      question.questionType === "scale" ? question.scaleMinLabel.trim() : null,
    scaleMaxLabel:
      question.questionType === "scale" ? question.scaleMaxLabel.trim() : null,
    isRequired: question.isRequired,
    sortOrder: index,
    options:
      question.questionType === "single_choice" ||
      question.questionType === "multiple_choice"
        ? question.options.map((option, optionIndex) => ({
            label: option.label.trim(),
            sortOrder: optionIndex,
          }))
        : [],
  };
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PollResultsPanel({ poll }: { poll: AdminHousePollSnapshot }) {
  const results = poll.results;

  if (!results) {
    return (
      <EmptyState
        title="Результати ще недоступні"
        description="Для цього опитування поки немає read-моделі результатів."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Участь квартир
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--cms-text)]">
            {results.participationCount ?? 0}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Режим
          </div>
          <div className="mt-2 font-semibold text-[var(--cms-text)]">
            {identityLabel(poll.identityMode)}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--cms-text-muted)]">
            Видимість
          </div>
          <div className="mt-2 font-semibold text-[var(--cms-text)]">
            {visibilityLabel(poll.resultsVisibility)}
          </div>
        </div>
      </div>

      {poll.identityMode === "anonymous" ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 text-sm leading-6 text-[var(--cms-text-muted)]">
          Анонімний режим: система показує факт участі квартири окремо,
          але відповіді не мають зв’язку з квартирою. Експорт також обезособлений.
        </div>
      ) : null}

      <div className="space-y-4">
        {results.questions.map((question, questionIndex) => (
          <div
            key={question.id}
            className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4"
          >
            <div className="font-semibold text-[var(--cms-text)]">
              {questionIndex + 1}. {question.question}
            </div>
            <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
              {questionTypeLabel(question.questionType)} · відповідей: {question.responseCount}
            </div>

            {question.options.length > 0 ? (
              <div className="mt-4 space-y-2">
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between gap-4 rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-sm"
                  >
                    <span>{option.label}</span>
                    <strong>{option.count}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {question.yesNo ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-sm">
                  Так: <strong>{question.yesNo.yes}</strong>
                </div>
                <div className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-2 text-sm">
                  Ні: <strong>{question.yesNo.no}</strong>
                </div>
              </div>
            ) : null}

            {question.scale ? (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-[var(--cms-text-muted)]">
                  Середнє: <strong>{question.scale.average ?? "—"}</strong> · шкала 1–{question.scale.max}
                </div>
                <div className="flex flex-wrap gap-2">
                  {question.scale.distribution.map((item) => (
                    <span
                      key={item.value}
                      className="rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-1 text-xs"
                    >
                      {item.value}: {item.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {question.freeText ? (
              <div className="mt-4">
                <div className="text-sm text-[var(--cms-text-muted)]">
                  Текстових відповідей: {question.freeText.count}
                </div>
                {question.freeText.responses?.length ? (
                  <div className="mt-2 space-y-2">
                    {question.freeText.responses.map((response, index) => (
                      <div
                        key={`${question.id}-text-${index}`}
                        className="rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 text-sm"
                      >
                        <div>{response.text}</div>
                        {poll.identityMode === "open" ? (
                          <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
                            {response.apartmentLabel
                              ? `Кв. ${response.apartmentLabel}`
                              : "Квартиру не вказано"}
                            {response.ownerName ? ` · ${response.ownerName}` : ""}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {poll.exportData ? (
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              poll.exportData?.filename ?? `poll-${poll.id}.csv`,
              poll.exportData?.csv ?? "",
            )
          }
          className={adminButtonClasses({ variant: "secondary" })}
        >
          Експорт CSV
        </button>
      ) : null}
    </div>
  );
}

export function HousePollsWorkspace({
  houseId,
  houseSlug,
  polls: snapshot,
  canPublish,
  canArchive,
  canRestore,
  canDelete,
}: Props) {
  void houseSlug;

  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [items] = useState(snapshot.items);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("active");
  const [mode, setMode] = useState<WorkspaceMode>("idle");
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PollDraft>(() => createEmptyPoll({ deterministic: true }));
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedSnapshot =
    items.find((item) => item.id === selectedPollId) ?? null;

  const counters = useMemo(
    () => ({
      active: items.filter((item) => item.lifecycleStatus === "published").length,
      draft: items.filter((item) => item.lifecycleStatus === "draft").length,
      archived: items.filter((item) => item.lifecycleStatus === "archived").length,
    }),
    [items],
  );

  const visibleItems = useMemo(() => {
    if (activeTab === "draft") {
      return items.filter((item) => item.lifecycleStatus === "draft");
    }
    if (activeTab === "archived") {
      return items.filter((item) => item.lifecycleStatus === "archived");
    }
    return items.filter((item) => item.lifecycleStatus === "published");
  }, [activeTab, items]);

  const settingsFrozen = draft.participationCount > 0;
  const questionsEditable =
    draft.lifecycleStatus === "draft" &&
    draft.pollStatus === "idle" &&
    draft.participationCount === 0;

  function refreshPage() {
    window.location.reload();
  }

  function resetWorkspace() {
    setMode("idle");
    setSelectedPollId(null);
    setDraft(createEmptyPoll());
    setActionError(null);
  }

  function openCreate() {
    setMode("create");
    setSelectedPollId(null);
    setDraft(createEmptyPoll());
    setActiveTab("draft");
    setActionError(null);
  }

  function openEdit(item: AdminHousePollSnapshot) {
    setMode("edit");
    setSelectedPollId(item.id);
    setDraft(mapPoll(item));
    setActionError(null);
  }

  function replaceQuestion(
    questionId: string,
    patch: Partial<PollDraftQuestion>,
  ) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    }));
  }

  function changeQuestionType(
    questionId: string,
    questionType: HousePollQuestionType,
  ) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          questionType,
          scaleMax: question.scaleMax === 10 ? 10 : 5,
          options:
            questionType === "single_choice" || questionType === "multiple_choice"
              ? question.options.length >= 2
                ? question.options
                : [createOption(), createOption()]
              : [],
        };
      }),
    }));
  }

  function addQuestion() {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createQuestion()],
    }));
  }

  function removeQuestion(questionId: string) {
    setDraft((current) => {
      if (current.questions.length <= 1) return current;
      return {
        ...current,
        questions: current.questions.filter((question) => question.id !== questionId),
      };
    });
  }

  function addOption(questionId: string) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId
          ? { ...question, options: [...question.options, createOption()] }
          : question,
      ),
    }));
  }

  function updateOption(questionId: string, optionId: string, label: string) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, label } : option,
              ),
            }
          : question,
      ),
    }));
  }

  function removeOption(questionId: string, optionId: string) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question) => {
        if (question.id !== questionId || question.options.length <= 2) {
          return question;
        }
        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId),
        };
      }),
    }));
  }

  async function persistDraft(): Promise<PollDraft | null> {
    setActionError(null);

    if (!draft.title.trim()) {
      setActionError("Вкажіть назву опитування.");
      return null;
    }

    if (draft.questions.length === 0) {
      setActionError("Додайте хоча б одне питання.");
      return null;
    }

    const questions = draft.questions.map(questionPayload);

    if (
      questions.some(
        (question) =>
          !question.question ||
          ((question.questionType === "single_choice" ||
            question.questionType === "multiple_choice") &&
            question.options.filter((option) => option.label).length < 2),
      )
    ) {
      setActionError(
        "Заповніть усі питання. Для варіантів відповіді потрібно щонайменше два непорожні варіанти.",
      );
      return null;
    }

    if (mode === "create") {
      const created = await dispatch<Record<string, unknown>>(
        {
          type: "polls.create",
          houseId,
          payload: {
            title: draft.title.trim(),
            description: draft.description.trim(),
            identityMode: draft.identityMode,
            resultsVisibility: draft.resultsVisibility,
            questions,
          },
        },
        { onError: setActionError },
      );

      if (!created) return null;

      const createdPoll =
        created.poll && typeof created.poll === "object"
          ? (created.poll as Record<string, unknown>)
          : created;

      return normalizeReturnedPoll(createdPoll, draft);
    }

    if (!selectedPollId) return null;

    const updated = await dispatch<Record<string, unknown>>(
      {
        type: "polls.update",
        houseId,
        payload: {
          id: selectedPollId,
          lockVersion: draft.lockVersion,
          title: draft.title.trim(),
          description: draft.description.trim(),
          identityMode: draft.identityMode,
          resultsVisibility: draft.resultsVisibility,
        },
      },
      { onError: setActionError },
    );

    if (!updated) return null;

    let saved = normalizeReturnedPoll(updated, draft);

    if (questionsEditable) {
      const replaced = await dispatch<Record<string, unknown>>(
        {
          type: "polls.replaceQuestions",
          houseId,
          payload: {
            id: selectedPollId,
            lockVersion: saved.lockVersion,
            questions,
          },
        },
        { onError: setActionError },
      );

      if (!replaced) return null;

      const replacedPoll =
        replaced.poll && typeof replaced.poll === "object"
          ? (replaced.poll as Record<string, unknown>)
          : replaced;

      saved = normalizeReturnedPoll(replacedPoll, {
        ...saved,
        questions: draft.questions,
      });
    }

    return saved;
  }

  async function saveOnly() {
    const saved = await persistDraft();
    if (!saved) return;
    refreshPage();
  }

  async function saveAndPublish() {
    if (!canPublish) return;

    const saved = await persistDraft();
    if (!saved) return;

    const published = await dispatch<Record<string, unknown>>(
      {
        type: "polls.publish",
        houseId,
        payload: { id: saved.id, lockVersion: saved.lockVersion },
      },
      { onError: setActionError },
    );

    if (!published) return;
    refreshPage();
  }

  async function runLifecycle(
    command: "openPoll" | "closePoll" | "archive" | "restore" | "delete",
  ) {
    if (!selectedSnapshot) return;

    if (command === "archive" && !canArchive) return;
    if (command === "restore" && !canRestore) return;
    if (command === "delete" && !canDelete) return;

    setActionError(null);

    const result = await dispatch<Record<string, unknown>>(
      {
        type: `polls.${command}`,
        houseId,
        payload: {
          id: selectedSnapshot.id,
          lockVersion: selectedSnapshot.lockVersion,
        },
      },
      { onError: setActionError },
    );

    if (!result) return;
    refreshPage();
  }

  async function deleteAllArchived() {
    if (!canDelete) return;

    setActionError(null);

    const result = await dispatch(
      {
        type: "polls.deleteAllArchived",
        houseId,
        payload: {},
      },
      { onError: setActionError },
    );

    if (!result) return;
    refreshPage();
  }

  return (
    <div className={`${adminSurfaceClass} p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cms-text)]">
            Опитування
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cms-text-muted)]">
            Створюйте опитування мешканців, налаштовуйте анонімність і
            видимість результатів, відкривайте та завершуйте збір відповідей.
            Від однієї квартири приймається лише одна незмінна відповідь.
          </p>
        </div>

        <button
          type="button"
          data-workspace-create-action="true"
          onClick={openCreate}
          className={adminButtonClasses({ variant: "primary" })}
        >
          Нове опитування
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <AdminSegmentedTabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as WorkspaceTab);
            resetWorkspace();
          }}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: counters[tab.key],
          }))}
        />

        {activeTab === "archived" && counters.archived > 0 && canDelete ? (
          <button
            type="button"
            onClick={() => void deleteAllArchived()}
            disabled={isPending}
            className={adminButtonClasses({ variant: "danger" })}
          >
            Очистити архів
          </button>
        ) : null}
      </div>

      {actionError || lastError ? (
        <div
          role="alert"
          className="mt-5 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] p-4 text-sm text-[var(--cms-danger-text)]"
        >
          {actionError ?? lastError}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {visibleItems.length === 0 ? (
          <EmptyState
            title={
              activeTab === "draft"
                ? "Чернеток поки немає"
                : activeTab === "archived"
                  ? "Архів порожній"
                  : "Опублікованих опитувань поки немає"
            }
            description="Створіть нове опитування, додайте питання та збережіть його як чернетку."
          />
        ) : (
          visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openEdit(item)}
              className="block w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4 text-left transition hover:border-[var(--cms-border-strong)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-[var(--cms-text)]">
                    {item.title}
                  </div>
                  {item.description ? (
                    <div className="mt-1 line-clamp-2 text-sm text-[var(--cms-text-muted)]">
                      {item.description}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 py-1 text-xs font-semibold text-[var(--cms-text)]">
                  {statusLabel(item)}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--cms-text-muted)]">
                <span>{identityLabel(item.identityMode)}</span>
                <span>{visibilityLabel(item.resultsVisibility)}</span>
                <span>Питань: {item.questions.length}</span>
                <span>Участь: {item.results?.participationCount ?? 0}</span>
                <span>Оновлено: {formatDateTime(item.updatedAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <AdminSidePanel
        title={
          mode === "create"
            ? "Нове опитування"
            : draft.title || "Редагування опитування"
        }
        description={
          mode === "create"
            ? "Спочатку опитування зберігається як чернетка."
            : `${statusLabel(draft)} · ${identityLabel(draft.identityMode)}`
        }
        isOpen={mode !== "idle"}
        onClose={resetWorkspace}
        maxWidthClassName="max-w-4xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex flex-wrap gap-2">
              {mode === "create" || draft.lifecycleStatus === "draft" ? (
                <button
                  type="button"
                  onClick={() => void saveOnly()}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "primary" })}
                >
                  {isPending ? "Зберігаємо..." : "Зберегти"}
                </button>
              ) : null}

              {(mode === "create" || draft.lifecycleStatus === "draft") &&
              canPublish ? (
                <button
                  type="button"
                  onClick={() => void saveAndPublish()}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "success" })}
                >
                  Зберегти й опублікувати
                </button>
              ) : null}

              {mode === "edit" &&
              draft.lifecycleStatus === "published" &&
              draft.pollStatus === "idle" ? (
                <button
                  type="button"
                  onClick={() => void runLifecycle("openPoll")}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "success" })}
                >
                  Відкрити опитування
                </button>
              ) : null}

              {mode === "edit" &&
              draft.lifecycleStatus === "published" &&
              draft.pollStatus === "active" ? (
                <button
                  type="button"
                  onClick={() => void runLifecycle("closePoll")}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "warning" })}
                >
                  Завершити опитування
                </button>
              ) : null}

              {mode === "edit" &&
              draft.lifecycleStatus === "published" &&
              draft.pollStatus === "completed" &&
              canArchive ? (
                <button
                  type="button"
                  onClick={() => void runLifecycle("archive")}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "secondary" })}
                >
                  В архів
                </button>
              ) : null}

              {mode === "edit" &&
              draft.lifecycleStatus === "archived" &&
              canRestore ? (
                <button
                  type="button"
                  onClick={() => void runLifecycle("restore")}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "secondary" })}
                >
                  Відновити
                </button>
              ) : null}
            </div>

            {mode === "edit" &&
            canDelete &&
            (draft.lifecycleStatus === "draft" ||
              draft.lifecycleStatus === "archived") ? (
              <button
                type="button"
                onClick={() => void runLifecycle("delete")}
                disabled={isPending}
                className={adminButtonClasses({ variant: "danger" })}
              >
                Видалити
              </button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-5">
          <section className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
            <h3 className="font-semibold text-[var(--cms-text)]">Основне</h3>
            <div className="mt-4 grid gap-4">
              <label>
                <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                  Назва
                </span>
                <input
                  value={draft.title}
                  disabled={isPending || draft.lifecycleStatus === "archived"}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Наприклад: Благоустрій подвірʼя"
                  className={adminInputClass}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                  Опис
                </span>
                <textarea
                  value={draft.description}
                  disabled={isPending || draft.lifecycleStatus === "archived"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Коротко поясніть мету опитування."
                  className={adminInputClass}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Ідентифікація відповіді
                  </span>
                  <select
                    value={draft.identityMode}
                    disabled={
                      isPending || settingsFrozen || draft.lifecycleStatus !== "draft"
                    }
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        identityMode: event.target.value as HousePollIdentityMode,
                      }))
                    }
                    className={adminInputClass}
                  >
                    <option value="open">Відкрите — відповідь повʼязана з квартирою</option>
                    <option value="anonymous">Анонімне — звʼязку відповіді з квартирою немає</option>
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
                    Видимість результатів
                  </span>
                  <select
                    value={draft.resultsVisibility}
                    disabled={
                      isPending || settingsFrozen || draft.lifecycleStatus !== "draft"
                    }
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        resultsVisibility:
                          event.target.value as HousePollResultsVisibility,
                      }))
                    }
                    className={adminInputClass}
                  >
                    <option value="immediate">Одразу після власної відповіді</option>
                    <option value="after_completion">Після завершення опитування</option>
                    <option value="hidden">Не показувати мешканцям</option>
                  </select>
                </label>
              </div>

              {settingsFrozen ? (
                <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-3 text-sm leading-6 text-[var(--cms-text-muted)]">
                  В опитуванні вже є участь квартир. Режим ідентифікації
                  та видимість результатів більше не змінюються.
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[var(--cms-text)]">Питання</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--cms-text-muted)]">
                  Доступні 5 типів: один варіант, кілька варіантів, Так/Ні,
                  шкала 1–5 або 1–10, вільний текст.
                </p>
              </div>
              {questionsEditable ? (
                <button
                  type="button"
                  onClick={addQuestion}
                  disabled={isPending}
                  className={adminButtonClasses({ variant: "secondary" })}
                >
                  Додати питання
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-4">
              {draft.questions.map((question, questionIndex) => (
                <div
                  key={question.id}
                  className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm text-[var(--cms-text)]">
                      Питання {questionIndex + 1}
                    </strong>
                    {questionsEditable && draft.questions.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="text-xs text-[var(--cms-danger-text)]"
                      >
                        Видалити
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 grid gap-3">
                    <input
                      value={question.question}
                      disabled={!questionsEditable || isPending}
                      onChange={(event) =>
                        replaceQuestion(question.id, {
                          question: event.target.value,
                        })
                      }
                      placeholder="Текст питання"
                      className={adminInputClass}
                    />

                    <textarea
                      value={question.description}
                      disabled={!questionsEditable || isPending}
                      onChange={(event) =>
                        replaceQuestion(question.id, {
                          description: event.target.value,
                        })
                      }
                      rows={2}
                      placeholder="Пояснення — необовʼязково"
                      className={adminInputClass}
                    />

                    <div className="grid gap-3 md:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-xs text-[var(--cms-text-muted)]">
                          Тип питання
                        </span>
                        <select
                          value={question.questionType}
                          disabled={!questionsEditable || isPending}
                          onChange={(event) =>
                            changeQuestionType(
                              question.id,
                              event.target.value as HousePollQuestionType,
                            )
                          }
                          className={adminInputClass}
                        >
                          {questionTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-end gap-2 pb-3 text-sm text-[var(--cms-text)]">
                        <input
                          type="checkbox"
                          checked={question.isRequired}
                          disabled={!questionsEditable || isPending}
                          onChange={(event) =>
                            replaceQuestion(question.id, {
                              isRequired: event.target.checked,
                            })
                          }
                        />
                        Обовʼязкове питання
                      </label>
                    </div>

                    {question.questionType === "single_choice" ||
                    question.questionType === "multiple_choice" ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-[var(--cms-text-muted)]">
                          Варіанти відповіді
                        </div>
                        {question.options.map((option, optionIndex) => (
                          <div key={option.id} className="flex gap-2">
                            <input
                              value={option.label}
                              disabled={!questionsEditable || isPending}
                              onChange={(event) =>
                                updateOption(
                                  question.id,
                                  option.id,
                                  event.target.value,
                                )
                              }
                              placeholder={`Варіант ${optionIndex + 1}`}
                              className={adminInputClass}
                            />
                            {questionsEditable && question.options.length > 2 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeOption(question.id, option.id)
                                }
                                className={adminButtonClasses({ variant: "danger" })}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {questionsEditable ? (
                          <button
                            type="button"
                            onClick={() => addOption(question.id)}
                            className={adminButtonClasses({ variant: "secondary" })}
                          >
                            Додати варіант
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    {question.questionType === "scale" ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <label>
                          <span className="mb-1 block text-xs text-[var(--cms-text-muted)]">
                            Шкала
                          </span>
                          <select
                            value={String(question.scaleMax)}
                            disabled={!questionsEditable || isPending}
                            onChange={(event) =>
                              replaceQuestion(question.id, {
                                scaleMax: event.target.value === "10" ? 10 : 5,
                              })
                            }
                            className={adminInputClass}
                          >
                            <option value="5">1–5</option>
                            <option value="10">1–10</option>
                          </select>
                        </label>

                        <label>
                          <span className="mb-1 block text-xs text-[var(--cms-text-muted)]">
                            Підпис мінімуму
                          </span>
                          <input
                            value={question.scaleMinLabel}
                            disabled={!questionsEditable || isPending}
                            onChange={(event) =>
                              replaceQuestion(question.id, {
                                scaleMinLabel: event.target.value,
                              })
                            }
                            placeholder="Напр. Не підтримую"
                            className={adminInputClass}
                          />
                        </label>

                        <label>
                          <span className="mb-1 block text-xs text-[var(--cms-text-muted)]">
                            Підпис максимуму
                          </span>
                          <input
                            value={question.scaleMaxLabel}
                            disabled={!questionsEditable || isPending}
                            onChange={(event) =>
                              replaceQuestion(question.id, {
                                scaleMaxLabel: event.target.value,
                              })
                            }
                            placeholder="Напр. Повністю підтримую"
                            className={adminInputClass}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {mode === "edit" && selectedSnapshot ? (
            <section className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
              <h3 className="font-semibold text-[var(--cms-text)]">Результати</h3>
              <div className="mt-4">
                <PollResultsPanel poll={selectedSnapshot} />
              </div>
            </section>
          ) : null}
        </div>
      </AdminSidePanel>
    </div>
  );
}
