"use client";

import { useMemo, useState } from "react";

import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { Button } from "@/src/shared/ui/admin/Button";
import { EmptyState } from "@/src/shared/ui/admin/EmptyState";
import {
  adminBodyClass,
  adminInsetSurfaceClass,
  adminMetaClass,
  adminSectionTitleClass,
} from "@/src/shared/ui/admin/adminStyles";
import { formatAdminDate } from "@/src/shared/utils/format/formatAdminDate";

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
  onApplyTemplateKeys: (templateKeys: string[]) => Promise<boolean | void>;
};

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
  const { dispatch, isPending } = useAdminContentCommand();

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
  const error = localError;

  async function applyTemplate(template: ContentTemplateSlot) {
    setLocalError(null);
    setLocalSuccess(null);
    setApplyingKey(template.templateKey);

    try {
      const applied = await onApplyTemplateKeys([template.templateKey]);

      if (applied === false) {
        setLocalError("Не вдалося застосувати шаблон. Перевірте дані шаблону та спробуйте ще раз.");
        return;
      }

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
    <div className="space-y-5">
      <div>
        <div className={adminMetaClass}>Шаблони</div>
        <h3 className={["mt-1", adminSectionTitleClass].join(" ")}>{title}</h3>
        <p className={["mt-1", adminBodyClass].join(" ")}>{description}</p>
      </div>

      {error ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}

      {localSuccess ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {localSuccess}
        </div>
      ) : null}

      <div className="space-y-3">
        {orderedTemplates.length > 0 ? (
          orderedTemplates.map((template) => (
            <article
              key={template.id}
              className={[adminInsetSurfaceClass, "p-4"].join(" ")}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-base font-semibold text-[var(--cms-text)]">
                    {template.name || template.title || "Шаблон без назви"}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[var(--cms-text-muted)]">
                    {template.description || getTemplatePreview(template)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--cms-text-soft)]">
                    <span>
                      Створено: {formatAdminDate(template.createdAt, "Дата не вказана")}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Слот {template.slotIndex} із {slotLimit}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setTemplateToApply(template)}
                    disabled={disabled || busy}
                    loading={applyingKey === template.templateKey}
                  >
                    Застосувати
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => setTemplateToDelete(template)}
                    disabled={disabled || busy}
                    loading={deletingKey === template.templateKey}
                  >
                    Видалити
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="Шаблонів поки немає"
            description="Створіть чернетку спеціаліста, заповніть її та збережіть як шаблон у формі."
          />
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
