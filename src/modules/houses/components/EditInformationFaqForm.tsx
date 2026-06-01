"use client";

import { useEffect, useMemo, useState } from "react";

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

  const initialItems = useMemo(() => {
    return faq.items.length
      ? faq.items.map((item) => ({
          question: item.question,
          answer: item.answer,
        }))
      : [{ question: "", answer: "" }];
  }, [faq.items]);

  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
    setLocalError(null);
  }, [initialItems]);

  function updateItem(index: number, field: "question" | "answer", value: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setLocalError(null);
  }

  function addItem() {
    setItems((prev) => [...prev, { question: "", answer: "" }]);
    setLocalError(null);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [{ question: "", answer: "" }];
    });
    setLocalError(null);
  }

  async function runCommand(command: FaqCommand) {
    setLocalError(null);

    const payload =
      command === "replaceItems"
        ? {
            lockVersion: faq.lockVersion,
            items,
          }
        : {
            lockVersion: faq.lockVersion,
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
  const isArchived = faq.status === "archived";
  const canPublish = faq.status !== "published";
  const canArchive = faq.status === "published";
  const canRestore = faq.status === "archived";

  return (
    <div className="rounded-3xl border border-[var(--cms-border)] bg-[var(--cms-surface)] p-6">
      <div className="mb-4 flex justify-between">
        <div>
          <div className="text-lg font-semibold text-[var(--cms-text)]">
            FAQ
          </div>
          <div className="text-sm text-[var(--cms-text-muted)]">
            Додавайте запитання та відповіді. Статус:{" "}
            {faq.status === "published"
              ? "опубліковано"
              : faq.status === "archived"
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
            onClick={() => runCommand("replaceItems")}
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
              onClick={() => runCommand("publish")}
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
