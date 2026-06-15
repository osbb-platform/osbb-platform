"use client";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import {
  adminDangerButtonClass,
  adminPrimaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

export type TemplateSectionKind = "faq" | "specialists" | "information_post";

export type ContentTemplateSlot = {
  id: string;
  sectionKind: TemplateSectionKind;
  templateKey: string;
  slotIndex: number;
  name: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  createdAt?: string;
};

type Props = {
  houseId: string;
  sectionKind: TemplateSectionKind;
  slotLimit: number;
  templates: ContentTemplateSlot[];
  title: string;
  description: string;
  disabled?: boolean;
  onApplyTemplateKeys: (templateKeys: string[]) => Promise<void>;
};

function formatDate(value?: string) {
  if (!value) return "Дата не вказана";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не вказана";

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getTemplatePreview(template: ContentTemplateSlot) {
  const payload = template.payload;

  if (template.sectionKind === "faq") {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return `${items.length} питань`;
  }

  if (template.sectionKind === "specialists") {
    const specialists = Array.isArray(payload.specialists) ? payload.specialists : [];
    return `${specialists.length} карток`;
  }

  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  return `${posts.length} матеріалів`;
}

export function ContentTemplateSlotsPanel({
  houseId,
  sectionKind,
  slotLimit,
  templates,
  title,
  description,
  disabled = false,
  onApplyTemplateKeys,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();

  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [templateToApply, setTemplateToApply] = useState<ContentTemplateSlot | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<ContentTemplateSlot | null>(null);

  const orderedTemplates = useMemo(() => {
    return templates.slice().sort((left, right) => {
      const rightTime = new Date(right.createdAt ?? "").getTime();
      const leftTime = new Date(left.createdAt ?? "").getTime();

      if (!Number.isNaN(rightTime) && !Number.isNaN(leftTime) && rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return right.slotIndex - left.slotIndex;
    });
  }, [templates]);

  const busy = isPending || Boolean(applyingKey) || Boolean(deletingKey);
  const error = localError ?? lastError;

  async function applyTemplate(template: ContentTemplateSlot) {
    setLocalError(null);
    setLocalSuccess(null);
    setApplyingKey(template.templateKey);

    try {
      await onApplyTemplateKeys([template.templateKey]);
      setTemplateToApply(null);
      setLocalSuccess("Шаблон застосовано. У поточному будинку створено чернетку.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не вдалося застосувати шаблон.");
    } finally {
      setApplyingKey(null);
    }
  }

  async function deleteTemplate(template: ContentTemplateSlot) {
    setLocalError(null);
    setLocalSuccess(null);
    setDeletingKey(template.templateKey);

    const deleted = await dispatch(
      {
        type: "templates.delete",
        houseId,
        payload: {
          sectionKind,
          slotIndex: template.slotIndex,
        },
      },
      {
        successMessage: null,
        onError: setLocalError,
      },
    );

    setDeletingKey(null);

    if (!deleted) return;

    setTemplateToDelete(null);
    setLocalSuccess("Шаблон видалено.");
  }

  return (
    <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--cms-text-soft)]">
          Шаблони
        </div>
        <h3 className="mt-1 text-lg font-semibold text-[var(--cms-text)]">
          {title}
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--cms-text-muted)]">
          {description}
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}

      {localSuccess ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {localSuccess}
        </div>
      ) : null}

      <div className="mt-4 max-h-[68vh] space-y-3 overflow-y-auto pr-1">
        {orderedTemplates.length > 0 ? (
          orderedTemplates.map((template) => (
            <article
              key={template.id}
              className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-4"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-base font-semibold text-[var(--cms-text)]">
                    {template.name || template.title || "Шаблон без назви"}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[var(--cms-text-muted)]">
                    {template.description || getTemplatePreview(template)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-[var(--cms-text-soft)]">
                    <span>Створено: {formatDate(template.createdAt)}</span>
                    <span>·</span>
                    <span>Слот {template.slotIndex} із {slotLimit}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateToApply(template)}
                    disabled={disabled || busy}
                    className={[adminPrimaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
                  >
                    {applyingKey === template.templateKey ? "Застосовуємо..." : "Застосувати"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateToDelete(template)}
                    disabled={disabled || busy}
                    className={[adminDangerButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
                  >
                    {deletingKey === template.templateKey ? "Видаляємо..." : "Видалити"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-6 text-sm leading-6 text-[var(--cms-text-muted)]">
            Шаблонів поки немає. Створіть чернетку, заповніть її та натисніть
            «Запамʼятати як шаблон» у правому нижньому куті форми.
          </div>
        )}
      </div>

      <PlatformConfirmModal
        open={Boolean(templateToApply)}
        title="Застосувати шаблон?"
        description={
          templateToApply
            ? `У поточному будинку буде створено нову чернетку з шаблону «${templateToApply.name || templateToApply.title}».`
            : ""
        }
        confirmLabel="Застосувати"
        pendingLabel="Застосовуємо..."
        tone="publish"
        isPending={Boolean(applyingKey)}
        onCancel={() => {
          if (!applyingKey) {
            setTemplateToApply(null);
          }
        }}
        onConfirm={() => {
          if (templateToApply) {
            void applyTemplate(templateToApply);
          }
        }}
      />

      <PlatformConfirmModal
        open={Boolean(templateToDelete)}
        title="Видалити шаблон?"
        description={
          templateToDelete
            ? `Шаблон «${templateToDelete.name || templateToDelete.title}» буде видалено із системи. Він більше не буде доступний в інших будинках.`
            : ""
        }
        confirmLabel="Видалити шаблон"
        pendingLabel="Видаляємо..."
        tone="destructive"
        isPending={Boolean(deletingKey)}
        onCancel={() => {
          if (!deletingKey) {
            setTemplateToDelete(null);
          }
        }}
        onConfirm={() => {
          if (templateToDelete) {
            void deleteTemplate(templateToDelete);
          }
        }}
      />
    </div>
  );
}
