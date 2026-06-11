"use client";

import { useMemo, useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { HouseFaqSnapshot } from "@/src/modules/houses/services/getAdminHouseFaq";

import {
  adminDangerButtonClass,
  adminIconButtonClass,
  adminInputClass,
  adminInsetSurfaceClass,
  adminPrimaryButtonClass,
  adminSuccessButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type FaqCommand = "replaceItems" | "publish" | "archive" | "restore" | "delete";

type Props = {
  houseId: string;
  faq: HouseFaqSnapshot;
  onClose: () => void;
};

export function EditInformationFaqForm({
  houseId,
  faq,
  onClose,
}: Props) {
  const { dispatch, isPending, lastError } = useAdminContentCommand();
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [currentLockVersion, setCurrentLockVersion] = useState(faq.lockVersion);
  const [currentStatus, setCurrentStatus] = useState(faq.status);

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
          lockVersion: currentLockVersion,
          items: normalizedItems,
        },
      },
      {
        refreshOnSuccess: options.refreshOnSuccess ?? true,
        successMessage: options.closeAfterSave ? "Збережено" : "FAQ збережено як чернетку",
        onError(error) {
          setLocalError(error);
        },
        onSuccess(data) {
          const nextLockVersion = extractLockVersion(data, currentLockVersion + 1);
          setCurrentLockVersion(nextLockVersion);
          setCurrentStatus("draft");
          setSavedMessage("FAQ збережено як чернетку. Тепер його можна підтвердити.");
          if (options.closeAfterSave) {
            onClose();
          }
        },
      },
    );

    return result;
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

  async function runCommand(command: FaqCommand) {
    setLocalError(null);

    const payload =
      command === "replaceItems"
        ? {
            lockVersion: currentLockVersion,
            items,
          }
        : {
            lockVersion: currentLockVersion,
          };

    const result = await dispatch<HouseFaqSnapshot>(
      {
        type: `faq.${command}`,
        houseId,
        payload,
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

    if (!result && !lastError) {
      return;
    }
  }

  const error = localError ?? lastError;
  const isArchived = currentStatus === "archived";
  const canPublish = currentStatus !== "published";
  const canArchive = currentStatus === "published";
  const canRestore = currentStatus === "archived";

  return (
    <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
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

        <button type="button" onClick={onClose} className={adminIconButtonClass} aria-label="Закрити форму FAQ">
          ×
        </button>
      </div>

      <div className="space-y-4">
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
                  disabled={isPending || items.length <= 1}
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
        <div className="mt-4 rounded-2xl border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]">
          {savedMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
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
