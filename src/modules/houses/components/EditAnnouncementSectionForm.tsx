"use client";

import {
  adminDangerButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  adminSuccessButtonClass,
  adminWarningButtonClass,
} from "@/src/shared/ui/admin/adminStyles";
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
          <div className="text-sm font-medium text-[var(--cms-text)]">
            Редактирование объявления
          </div>
          <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
            Изменения сохраняются в house_sections и version history.
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть редактор"
            className={adminIconButtonClass}
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Дата публикации</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">{publishedAt}</div>
        </div>

        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Последнее обновление</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">{updatedAt}</div>
        </div>

        <div className={[adminInsetSurfaceClass, "px-4 py-3"].join(" ")}>
          <div className="text-sm text-[var(--cms-text-muted)]">Текущий тип</div>
          <div className="mt-1 font-medium text-[var(--cms-text)]">
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
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Заголовок объявления
          </label>
          <input
            name="title"
            type="text"
            defaultValue={section.title ?? ""}
            className={adminInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Тип объявления
          </label>
          <select
            name="level"
            defaultValue={level}
            className={adminInputClass}
          >
            <option value="danger">Красный — важное</option>
            <option value="warning">Оранжевый — обратить внимание</option>
            <option value="info">Салатовый — обычное объявление</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
            Текст объявления
          </label>
          <textarea
            name="body"
            defaultValue={body}
            rows={6}
            className={adminInputClass}
          />
        </div>

        {combinedError ? (
          <div className="rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
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
                className={`${adminPrimaryButtonClass} min-h-16 rounded-3xl px-10 py-5 text-2xl ${
                  isSaving ? "cursor-wait opacity-90" : ""
                } disabled:opacity-60`}
              >
                {isSaving ? "Сохраняем..." : "Сохранить"}
              </button>

              {isDraftLike ? (
                <button
                  type="button"
                  disabled={buttonsDisabled}
                  onClick={() => setConfirmAction("delete")}
                  className={`${adminDangerButtonClass} min-h-16 rounded-3xl px-10 py-5 text-2xl disabled:opacity-60`}
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
                  className={`${adminSuccessButtonClass} min-h-16 rounded-3xl px-10 py-5 text-2xl disabled:opacity-60`}
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
                  className={`${adminWarningButtonClass} min-h-16 rounded-3xl px-10 py-5 text-2xl disabled:opacity-60`}
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
                  className={`${adminDangerButtonClass} min-h-16 rounded-3xl px-10 py-5 text-2xl disabled:opacity-60`}
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
