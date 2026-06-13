"use client";

import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import { PlatformConfirmModal } from "@/src/modules/cms/components/PlatformConfirmModal";
import {
  adminDangerButtonClass,
  adminInputClass,
  adminSecondaryButtonClass,
  adminSuccessButtonClass,
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
};

type Props = {
  houseId: string;
  sectionKind: TemplateSectionKind;
  slotLimit: number;
  templates: ContentTemplateSlot[];
  title: string;
  description: string;
  disabled?: boolean;
  multiSelect?: boolean;
  buildPayload: () => Record<string, unknown> | null;
  onApplyTemplateKeys: (templateKeys: string[]) => Promise<void>;
  applyConfirmationMessage?: string;
};

function getDefaultName(sectionKind: TemplateSectionKind, slotIndex: number) {
  if (sectionKind === "faq") return `FAQ шаблон ${slotIndex}`;
  if (sectionKind === "specialists") return `Шаблон спеціалістів ${slotIndex}`;
  return `Шаблон інформації ${slotIndex}`;
}

export function ContentTemplateSlotsPanel({
  houseId,
  sectionKind,
  slotLimit,
  templates,
  title,
  description,
  disabled = false,
  multiSelect = false,
  buildPayload,
  onApplyTemplateKeys,
  applyConfirmationMessage,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [slotIndex, setSlotIndex] = useState(1);
  const [name, setName] = useState(getDefaultName(sectionKind, 1));
  const [slotDescription, setSlotDescription] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);

  const templatesBySlot = useMemo(() => {
    return new Map(templates.map((template) => [template.slotIndex, template]));
  }, [templates]);

  function toggleTemplate(templateKey: string) {
    setLocalError(null);
    setLocalSuccess(null);

    if (!multiSelect) {
      setSelectedKeys([templateKey]);
      return;
    }

    setSelectedKeys((current) =>
      current.includes(templateKey)
        ? current.filter((key) => key !== templateKey)
        : [...current, templateKey],
    );
  }

  function handleSlotChange(nextSlotIndex: number) {
    setSlotIndex(nextSlotIndex);

    const existing = templatesBySlot.get(nextSlotIndex);
    setName(existing?.name || existing?.title || getDefaultName(sectionKind, nextSlotIndex));
    setSlotDescription(existing?.description ?? "");
    setLocalError(null);
    setLocalSuccess(null);
  }

  async function saveCurrentToSlot() {
    setLocalError(null);
    setLocalSuccess(null);

    const payload = buildPayload();

    if (!payload) {
      setLocalError("Немає коректних даних для збереження шаблону.");
      return;
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      setLocalError("Вкажіть назву шаблону.");
      return;
    }

    setSaving(true);

    const saved = await dispatch(
      {
        type: "templates.upsert",
        houseId,
        payload: {
          sectionKind,
          slotIndex,
          name: normalizedName,
          description: slotDescription.trim(),
          payload,
        },
      },
      {
        successMessage: null,
        onError: setLocalError,
      },
    );

    setSaving(false);

    if (!saved) return;

    setLocalSuccess("Шаблон збережено.");
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

    setSelectedKeys((current) => current.filter((key) => key !== template.templateKey));
    setLocalSuccess("Шаблон видалено.");
  }

  async function runApplySelectedTemplates() {
    setLocalError(null);
    setLocalSuccess(null);

    if (!selectedKeys.length) {
      setLocalError("Оберіть шаблон.");
      return;
    }

    setApplying(true);

    try {
      await onApplyTemplateKeys(selectedKeys);
      setConfirmApplyOpen(false);
      setLocalSuccess("Шаблон застосовано.");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Не вдалося застосувати шаблон.");
    } finally {
      setApplying(false);
    }
  }

  function applySelectedTemplates() {
    setLocalError(null);
    setLocalSuccess(null);

    if (!selectedKeys.length) {
      setLocalError("Оберіть шаблон.");
      return;
    }

    if (applyConfirmationMessage) {
      setConfirmApplyOpen(true);
      return;
    }

    void runApplySelectedTemplates();
  }

  const busy = isPending || saving || applying || Boolean(deletingKey);
  const error = localError ?? lastError;

  return (
    <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

        <button
          type="button"
          onClick={applySelectedTemplates}
          disabled={disabled || busy || selectedKeys.length === 0}
          className={[adminSuccessButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
        >
          {applying ? "Застосовуємо..." : "Застосувати вибрані"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: slotLimit }, (_, index) => index + 1).map((currentSlot) => {
          const template = templatesBySlot.get(currentSlot);
          const isSelected = template ? selectedKeys.includes(template.templateKey) : false;

          return (
            <div
              key={currentSlot}
              className="rounded-2xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type={multiSelect ? "checkbox" : "radio"}
                    checked={isSelected}
                    disabled={disabled || busy || !template}
                    onChange={() => template ? toggleTemplate(template.templateKey) : undefined}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--cms-text)]">
                      Слот {currentSlot}: {template?.name || template?.title || "порожній"}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--cms-text-muted)]">
                      {template?.description || (template ? "Опис не вказано." : "Слот ще не заповнено.")}
                    </span>
                  </span>
                </label>

                {template ? (
                  <button
                    type="button"
                    onClick={() => void deleteTemplate(template)}
                    disabled={disabled || busy}
                    className={[adminDangerButtonClass, "px-3 py-2 text-xs disabled:opacity-40"].join(" ")}
                  >
                    {deletingKey === template.templateKey ? "..." : "Видалити"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-dashed border-[var(--cms-border)] bg-[var(--cms-surface)] p-3 lg:grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select
          value={slotIndex}
          onChange={(event) => handleSlotChange(Number(event.target.value))}
          disabled={disabled || busy}
          className={adminInputClass}
        >
          {Array.from({ length: slotLimit }, (_, index) => index + 1).map((currentSlot) => (
            <option key={currentSlot} value={currentSlot}>
              Слот {currentSlot}
            </option>
          ))}
        </select>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled || busy}
          className={adminInputClass}
          placeholder="Назва шаблону"
        />

        <input
          value={slotDescription}
          onChange={(event) => setSlotDescription(event.target.value)}
          disabled={disabled || busy}
          className={adminInputClass}
          placeholder="Опис шаблону"
        />

        <button
          type="button"
          onClick={() => void saveCurrentToSlot()}
          disabled={disabled || busy}
          className={[adminSecondaryButtonClass, "disabled:cursor-not-allowed disabled:opacity-40"].join(" ")}
        >
          {saving ? "Зберігаємо..." : "Зберегти в слот"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}

      {localSuccess ? (
        <div className="mt-3 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {localSuccess}
        </div>
      ) : null}

      <PlatformConfirmModal
        open={confirmApplyOpen}
        title="Застосувати шаблон FAQ?"
        description={applyConfirmationMessage ?? null}
        confirmLabel="Застосувати шаблон"
        tone="warning"
        isPending={applying}
        pendingLabel="Застосовуємо..."
        onConfirm={() => void runApplySelectedTemplates()}
        onCancel={() => {
          if (!applying) {
            setConfirmApplyOpen(false);
          }
        }}
      />
    </div>
  );
}
