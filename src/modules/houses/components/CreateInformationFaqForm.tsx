"use client";

import {
  useState } from "react";

import type { ContentTemplateSlot } from "@/src/modules/houses/components/ContentTemplateSlotsPanel";
import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseFaqSnapshot } from "@/src/modules/houses/services/getAdminHouseFaq";

import {
  adminButtonClasses,
  adminInputClass,
  adminInsetSurfaceClass,
} from "@/src/shared/ui/admin/adminStyles";

type Props = {
  houseId: string;
  onClose: () => void;
  templates?: ContentTemplateSlot[];
  templateSlotLimit?: number;
};

type DraftFaqItem = {
  question: string;
  answer: string;
};

function findNextTemplateSlot(templates: ContentTemplateSlot[], slotLimit: number) {
  const usedSlots = new Set(templates.map((template) => template.slotIndex));

  for (let slotIndex = 1; slotIndex <= slotLimit; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      return slotIndex;
    }
  }

  return null;
}

export function CreateInformationFaqForm({
  houseId,
  onClose,
  templates = [],
  templateSlotLimit = 3,
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();
  const [items, setItems] = useState<DraftFaqItem[]>([
    { question: "", answer: "" },
  ]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  function updateItem(index: number, field: keyof DraftFaqItem, value: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setLocalError(null);
    setSavedMessage(null);
  }

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
    setLocalError(null);
    setSavedMessage(null);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [{ question: "", answer: "" }];
    });
    setLocalError(null);
    setSavedMessage(null);
  }

  function normalizeLocalItems() {
    return items
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);
  }

  async function saveFaqDraft() {
    setLocalError(null);
    setSavedMessage(null);

    const normalizedItems = normalizeLocalItems();

    if (normalizedItems.length < 1) {
      setLocalError("Додайте щонайменше одне питання та відповідь.");
      return;
    }

    await dispatch<HouseFaqSnapshot>(
      {
        type: "faq.create",
        houseId,
        payload: {
          items: normalizedItems,
        },
      },
      {
        successMessage: "FAQ збережено як чернетку",
        onError(error) {
          setLocalError(error);
        },
        onSuccess() {
          onClose();
        },
      },
    );
  }

  async function saveCurrentFormAsTemplate() {
    setLocalError(null);
    setSavedMessage(null);

    const normalizedItems = normalizeLocalItems();

    if (normalizedItems.length < 1) {
      setLocalError("Додайте щонайменше одне питання та відповідь перед збереженням шаблону.");
      return;
    }

    const slotIndex = findNextTemplateSlot(templates, templateSlotLimit);

    if (!slotIndex) {
      setLocalError(
        "Вільних слотів для шаблонів більше немає. Видаліть один із поточних шаблонів, щоб звільнити слот.",
      );
      return;
    }

    setIsSavingTemplate(true);

    await dispatch(
      {
        type: "templates.upsert",
        houseId,
        payload: {
          sectionKind: "faq",
          slotIndex,
          name: normalizedItems[0]?.question || "FAQ-шаблон",
          description: "",
          payload: {
            items: normalizedItems,
          },
        },
      },
      {
        successMessage: "FAQ-шаблон збережено",
        onError(error) {
          setLocalError(error);
        },
        onSuccess() {
          setSavedMessage("FAQ-шаблон збережено. Його можна застосувати в будь-якому будинку.");
        },
      },
    );

    setIsSavingTemplate(false);
  }

  const error = localError;
  const actionsDisabled = isPending || isSavingTemplate;

  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <div className="mb-4 flex flex-col gap-2">
        <div className="text-lg font-semibold text-[var(--cms-text)]">
          Новий FAQ
        </div>
        <div className="text-sm text-[var(--cms-text-muted)]">
          Заповніть питання та відповіді. Запис буде створено тільки після натискання «Зберегти».
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item, index) => (
          <div key={index} className={adminInsetSurfaceClass}>
            <div className="grid gap-3">
              <input
                value={item.question}
                onChange={(event) => updateItem(index, "question", event.target.value)}
                placeholder="Запитання"
                className={adminInputClass}
              />

              <textarea
                value={item.answer}
                onChange={(event) => updateItem(index, "answer", event.target.value)}
                rows={4}
                placeholder="Відповідь"
                className={adminInputClass}
              />

              <div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={actionsDisabled || items.length <= 1}
                  className={[
                    adminButtonClasses({ variant: "danger" }),
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  ].join(" ")}
                >
                  Видалити питання
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={addItem}
          disabled={actionsDisabled}
          className={[
            adminButtonClasses({ variant: "primary" }),
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          + Додати
        </button>
      </div>

      {savedMessage ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {savedMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={() => void saveFaqDraft()}
            className={[
              adminButtonClasses({ variant: "primary" }),
              "disabled:cursor-not-allowed disabled:opacity-40",
            ].join(" ")}
          >
            {isPending ? "Зберігаємо..." : "Зберегти"}
          </button>

          <button
            type="button"
            disabled={actionsDisabled}
            onClick={onClose}
            className={[
              adminButtonClasses({ variant: "secondary" }),
              "disabled:cursor-not-allowed disabled:opacity-40",
            ].join(" ")}
          >
            Скасувати
          </button>
        </div>

        <button
          type="button"
          disabled={actionsDisabled}
          onClick={() => void saveCurrentFormAsTemplate()}
          className={[
            adminButtonClasses({ variant: "secondary" }),
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          {isSavingTemplate ? "Зберігаємо шаблон..." : "Запамʼятати як шаблон"}
        </button>
      </div>
    </div>
  );
}
