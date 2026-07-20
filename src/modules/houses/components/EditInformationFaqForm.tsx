"use client";

import { useMemo, useState } from "react";

import type { CrossHouseDuplicateTarget } from "@/src/modules/houses/components/CrossHouseDuplicatePanel";
import { ContentWorkspaceActionButtons } from "@/src/modules/houses/components/ContentWorkspaceActionButtons";
import type { ContentTemplateSlot } from "@/src/modules/houses/components/ContentTemplateSlotsPanel";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseFaqSnapshot } from "@/src/modules/houses/services/getAdminHouseFaq";

import {
  adminDangerButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSuccessButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type FaqCommand = "archive" | "restore" | "delete";

type Props = {
  houseId: string;
  faq: HouseFaqSnapshot;
  onClose: () => void;
  duplicateTargets?: CrossHouseDuplicateTarget[];
  templates?: ContentTemplateSlot[];
  templateSlotLimit?: number;
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

export function EditInformationFaqForm({
  houseId,
  faq,
  onClose,
  duplicateTargets = [],
  templates = [],
  templateSlotLimit = 3,
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [currentLockVersion, setCurrentLockVersion] = useState(faq.lockVersion);
  const [currentStatus, setCurrentStatus] = useState(faq.status);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const initialItems = useMemo(() => {
    return faq.items.length
      ? faq.items.map((item) => ({
          question: item.question,
          answer: item.answer,
        }))
      : [{ question: "", answer: "" }];
  }, [faq.items]);

  const [items, setItems] = useState(initialItems);

  function updateItem(index: number, field: "question" | "answer", value: string) {
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

  function extractLockVersion(data: unknown, fallback: number) {
    if (!data || typeof data !== "object") {
      return fallback;
    }

    const record = data as Record<string, unknown>;
    const nextLockVersion =
      typeof record.lockVersion === "number"
        ? record.lockVersion
        : typeof record.lock_version === "number"
          ? record.lock_version
          : fallback;

    return nextLockVersion;
  }

  function extractStatus(data: unknown, fallback: typeof currentStatus) {
    if (!data || typeof data !== "object") {
      return fallback;
    }

    const record = data as Record<string, unknown>;
    const nextStatus =
      typeof record.status === "string"
        ? record.status
        : typeof record.lifecycle_status === "string"
          ? record.lifecycle_status
          : fallback;

    return nextStatus === "published" || nextStatus === "archived" || nextStatus === "draft"
      ? nextStatus
      : fallback;
  }

  async function saveFaqItems(options: { closeAfterSave?: boolean; refreshOnSuccess?: boolean } = {}) {
    setLocalError(null);
    setSavedMessage(null);

    const normalizedItems = normalizeLocalItems();

    if (normalizedItems.length < 1) {
      const message = "Додайте щонайменше одне питання та відповідь.";
      setLocalError(message);
      return null;
    }

    const result = await dispatch(
      {
        type: "faq.replaceItems",
        houseId,
        payload: {
          faqId: faq.id,
          lockVersion: currentLockVersion,
          items: normalizedItems,
        },
      },
      {
        refreshOnSuccess: options.refreshOnSuccess ?? true,
        successMessage: "FAQ збережено",
        onError(error) {
          setLocalError(error);
        },
        onSuccess(data) {
          const nextLockVersion = extractLockVersion(data, currentLockVersion + 1);
          const nextStatus = extractStatus(data, currentStatus);

          setCurrentLockVersion(nextLockVersion);
          setCurrentStatus(nextStatus);
          setSavedMessage(
            nextStatus === "published"
              ? "FAQ оновлено. Зміни залишаються опублікованими на сайті."
              : "FAQ збережено як чернетку. Тепер його можна підтвердити.",
          );

          if (options.closeAfterSave) {
            onClose();
          }
        },
      },
    );

    return result;
  }

  async function saveFaqDraftAsTemplate() {
    setLocalError(null);
    setSavedMessage(null);

    if (currentStatus !== "draft") {
      setLocalError("Шаблон можна створити тільки з FAQ-чернетки.");
      return;
    }

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
          setSavedMessage("FAQ-шаблон збережено. Він доступний у всіх будинках.");
        },
      },
    );

    setIsSavingTemplate(false);
  }

  async function publishFaq() {
    setLocalError(null);
    setSavedMessage(null);

    const savedFaq = await saveFaqItems({
      refreshOnSuccess: false,
    });

    if (!savedFaq) {
      return;
    }

    const nextLockVersion = extractLockVersion(savedFaq, currentLockVersion + 1);

    await dispatch(
      {
        type: "faq.publish",
        houseId,
        payload: {
          faqId: faq.id,
          lockVersion: nextLockVersion,
        },
      },
      {
        successMessage: "FAQ опубліковано",
        onError(error) {
          setLocalError(error);
        },
        onSuccess(data) {
          setCurrentLockVersion(extractLockVersion(data, nextLockVersion + 1));
          setCurrentStatus(extractStatus(data, "published"));
          onClose();
        },
      },
    );
  }

  async function copyFaqToDraft() {
    setLocalError(null);

    await dispatch<HouseFaqSnapshot>(
      {
        type: "faq.duplicate",
        houseId,
        payload: {
          sourceId: faq.id,
          targetHouseIds: [houseId],
        },
      },
      {
        successMessage: "FAQ скопійовано в чернетку",
        onError(error) {
          setLocalError(error);
        },
        onSuccess() {
          onClose();
        },
      },
    );
  }

  async function runCommand(command: FaqCommand) {
    setLocalError(null);

    await dispatch<HouseFaqSnapshot>(
      {
        type: `faq.${command}`,
        houseId,
        payload: {
          faqId: faq.id,
          lockVersion: currentLockVersion,
        },
      },
      {
        onError(error) {
          setLocalError(error);
        },
        onSuccess() {
          onClose();
        },
      },
    );
  }

  const error = localError;
  const isArchived = currentStatus === "archived";
  const canPublish = currentStatus === "draft";
  const canArchive = currentStatus === "published";
  const canRestore = currentStatus === "archived";

  return (
    <div className="rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <div className="mb-4 flex justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--cms-text)]">
            FAQ
          </div>
          <div className="text-sm text-[var(--cms-text-muted)]">
            Додавайте запитання та відповіді. Статус:{" "}
            {currentStatus === "published"
              ? "опубліковано"
              : currentStatus === "archived"
                ? "архів"
                : "чернетка"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {faq.status !== "draft" ? (
            <ContentWorkspaceActionButtons
              houseId={houseId}
              sourceId={faq.id}
              commandType="faq.duplicate"
              duplicateTargets={duplicateTargets}
              disabled={isPending}
              onCopy={copyFaqToDraft}
              duplicatePanelTitle="Копії FAQ в інші будинки"
            />
          ) : null}

          <button type="button" onClick={onClose} className={adminIconButtonClass} aria-label="Закрити форму FAQ">
            ×
          </button>
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
                disabled={isArchived}
              />

              <textarea
                value={item.answer}
                onChange={(event) => updateItem(index, "answer", event.target.value)}
                rows={4}
                placeholder="Відповідь"
                className={adminInputClass}
                disabled={isArchived}
              />

              <div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={isPending || isArchived || items.length <= 1}
                  className={[
                    adminDangerButtonClass,
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
          disabled={isPending || isArchived}
          className={[
            adminPrimaryButtonClass,
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
            disabled={isPending || isArchived}
            onClick={() => saveFaqItems()}
            className={[
              adminPrimaryButtonClass,
              "disabled:cursor-not-allowed disabled:opacity-40",
            ].join(" ")}
          >
            Зберегти
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => runCommand("delete")}
            className={adminDangerButtonClass}
          >
            Видалити FAQ
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {currentStatus === "draft" ? (
            <button
              type="button"
              disabled={isPending || isSavingTemplate}
              onClick={() => void saveFaqDraftAsTemplate()}
              className={[
                adminSecondaryButtonClass,
                "disabled:cursor-not-allowed disabled:opacity-40",
              ].join(" ")}
            >
              {isSavingTemplate ? "Зберігаємо шаблон..." : "Запамʼятати як шаблон"}
            </button>
          ) : null}

          {canRestore ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => runCommand("restore")}
              className={adminPrimaryButtonClass}
            >
              Відновити
            </button>
          ) : null}

          {canArchive ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => runCommand("archive")}
              className={adminDangerButtonClass}
            >
              В архів
            </button>
          ) : null}

          {canPublish ? (
            <button
              type="button"
              disabled={isPending || isArchived}
              onClick={publishFaq}
              className={[
                adminSuccessButtonClass,
                "disabled:cursor-not-allowed disabled:opacity-40",
              ].join(" ")}
            >
              Підтвердити
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
