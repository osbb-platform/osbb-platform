"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import { deleteHouseSection } from "@/src/modules/houses/actions/deleteHouseSection";
import { archiveHouseAnnouncementSection } from "@/src/modules/houses/actions/archiveHouseAnnouncementSection";
import { publishHouseAnnouncementSection } from "@/src/modules/houses/actions/publishHouseAnnouncementSection";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";

type EditAnnouncementSectionFormProps = {
  houseId: string;
  houseSlug: string;
  housePageId?: string | null;
  section: {
    id: string;
    title: string | null;
    status: "draft" | "in_review" | "published" | "archived";
    content: Record<string, unknown>;
  };
  onClose?: () => void;
};

const initialState = {
  error: null,
};


function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "Не опубликовано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Не опубликовано";
  }

  return date.toLocaleString("ru-RU");
}

function getLevelLabel(level: string) {
  if (level === "danger") {
    return "Важное";
  }

  if (level === "warning") {
    return "Обратить внимание";
  }

  return "Обычное объявление";
}

export function EditAnnouncementSectionForm({
  houseId,
  houseSlug,
  housePageId,
  section,
  onClose,
}: EditAnnouncementSectionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const hasSubmittedRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);
  const [confirmAction, setConfirmAction] = useState<
    "publish" | "archive" | "delete" | null
  >(null);
  const [isMutating, startTransition] = useTransition();

  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const body =
    typeof section.content.body === "string" ? section.content.body : "";

  const level =
    typeof section.content.level === "string" ? section.content.level : "info";

  const publishedAt = formatDateTime(section.content.publishedAt);
  const updatedAt = formatDateTime(section.content.updatedAt);

  const isDraftLike =
    section.status === "draft" || section.status === "in_review";
  const isPublished = section.status === "published";
  const isArchived = section.status === "archived";

  function buildFormData() {
    const formElement = formRef.current;

    if (!formElement) {
      throw new Error("Форма объявления не найдена.");
    }

    return new FormData(formElement);
  }

  function runMutation(
    kind: "publish" | "archive" | "delete",
    action: (formData: FormData) => Promise<{ error: string | null }>,
  ) {
    setActionError(null);
    setPendingAction(kind);

    startTransition(async () => {
      try {
        const formData = buildFormData();
        const result = await action(formData);

        if (result.error) {
          setActionError(result.error);
          return;
        }

        onClose?.();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : "Не удалось выполнить действие.",
        );
      } finally {
        setPendingAction(null);
      }
    });
  }

  useEffect(() => {
    if (!hasSubmittedRef.current) {
      return;
    }

    if (state.error !== null) {
      setIsSaving(false);
      hasSubmittedRef.current = false;
      return;
    }

    if (!isPending && state.error === null) {
      const timeoutId = window.setTimeout(() => {
        router.refresh();
        onClose?.();
        hasSubmittedRef.current = false;
        setIsSaving(false);
      }, 400);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isPending, state.error, router, onClose]);

  const combinedError = state.error ?? actionError;
  const buttonsDisabled = isPending || isMutating;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-200">
            Редактирование объявления
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Изменения сохраняются в house_sections и version history.
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть редактор"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 text-lg font-medium text-white transition hover:bg-slate-800"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-sm text-slate-400">Дата публикации</div>
          <div className="mt-1 font-medium text-white">{publishedAt}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-sm text-slate-400">Последнее обновление</div>
          <div className="mt-1 font-medium text-white">{updatedAt}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-sm text-slate-400">Текущий тип</div>
          <div className="mt-1 font-medium text-white">
            {getLevelLabel(level)}
          </div>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="grid gap-4">
        <input type="hidden" name="sectionId" value={section.id} />
        <input type="hidden" name="houseId" value={houseId} />
        <input type="hidden" name="houseSlug" value={houseSlug} />
        <input type="hidden" name="housePageId" value={housePageId ?? ""} />
        <input type="hidden" name="kind" value="announcements" />
        <input type="hidden" name="status" value={section.status} />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Заголовок объявления
          </label>
          <input
            name="title"
            type="text"
            defaultValue={section.title ?? ""}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Тип объявления
          </label>
          <select
            name="level"
            defaultValue={level}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          >
            <option value="danger">Красный — важное</option>
            <option value="warning">Оранжевый — обратить внимание</option>
            <option value="info">Серый — обычное объявление</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
            Текст объявления
          </label>
          <textarea
            name="body"
            defaultValue={body}
            rows={6}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
          />
        </div>

        {combinedError ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {combinedError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div className="flex min-w-max flex-nowrap items-end justify-between gap-6">
            <div className="flex flex-nowrap items-center gap-3">
              <button
                type="button"
                disabled={buttonsDisabled || isSaving}
                onClick={() => {
                  hasSubmittedRef.current = true;
                  setIsSaving(true);
                  setActionError(null);

                  requestAnimationFrame(() => {
                    formRef.current?.requestSubmit();
                  });
                }}
                className={`inline-flex min-h-16 items-center justify-center rounded-3xl px-10 py-5 text-2xl font-medium transition ${
                  isSaving
                    ? "bg-slate-300 text-slate-700 opacity-90 cursor-wait"
                    : "bg-white text-slate-950 hover:bg-slate-200"
                } disabled:opacity-60`}
              >
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>

              {isDraftLike ? (
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("delete")}
                  className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-red-900 px-10 py-5 text-2xl font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                >
                  {pendingAction === "delete" ? "Удаляем..." : "Удалить"}
                </button>
              ) : null}
            </div>

            {isDraftLike ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("publish")}
                  className="inline-flex min-h-16 items-center justify-center rounded-3xl bg-emerald-500 px-10 py-5 text-2xl font-medium text-white transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {pendingAction === "publish" ? "Подтверждаем..." : "Подтвердить"}
                </button>
              </div>
            ) : null}

            {isPublished ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("archive")}
                  className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-amber-700 px-10 py-5 text-2xl font-medium text-amber-300 transition hover:bg-amber-950/30 disabled:opacity-60"
                >
                  {pendingAction === "archive" ? "Архивируем..." : "Архивировать"}
                </button>
              </div>
            ) : null}

            {isArchived ? (
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("delete")}
                  className="inline-flex min-h-16 items-center justify-center rounded-3xl border border-red-900 px-10 py-5 text-2xl font-medium text-red-300 transition hover:bg-red-950/40 disabled:opacity-60"
                >
                  {pendingAction === "delete" ? "Удаляем..." : "Удалить"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </form>

      <PlatformConfirmModal
        open={confirmAction === "delete"}
        title={isArchived ? "Удалить архивное объявление?" : "Удалить черновик объявления?"}
        description={
          isArchived
            ? "Архивное объявление будет удалено из системы без возможности восстановления."
            : "Черновик объявления будет удален без возможности восстановления. Это действие затронет только текущую запись."
        }
        confirmLabel="Удалить объявление"
        pendingLabel="Удаляем..."
        tone="destructive"
        isPending={pendingAction === "delete" && isMutating}
        onCancel={() => {
          if (!isMutating) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          runMutation("delete", deleteHouseSection);
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "publish"}
        title="Подтвердить публикацию объявления?"
        description="После подтверждения объявление станет видимым для жильцов на сайте дома."
        confirmLabel="Подтвердить публикацию"
        pendingLabel="Подтверждаем..."
        tone="publish"
        isPending={pendingAction === "publish" && isMutating}
        onCancel={() => {
          if (!isMutating) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          runMutation("publish", publishHouseAnnouncementSection);
        }}
      />

      <PlatformConfirmModal
        open={confirmAction === "archive"}
        title="Перенести объявление в архив?"
        description="После архивации объявление исчезнет из публичной части сайта и перестанет быть видимым жильцам. В CMS оно останется доступным в архиве."
        confirmLabel="Архивировать объявление"
        pendingLabel="Архивируем..."
        tone="warning"
        isPending={pendingAction === "archive" && isMutating}
        onCancel={() => {
          if (!isMutating) {
            setConfirmAction(null);
          }
        }}
        onConfirm={() => {
          setConfirmAction(null);
          runMutation("archive", archiveHouseAnnouncementSection);
        }}
      />
    </div>
  );
}
