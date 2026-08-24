"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createChairmanAnnouncement } from "@/src/modules/houses/chairman/createChairmanAnnouncement";
import {
  PubButton,
  PubCard,
  PubInput,
  PubSelect,
  PubTextarea,
} from "@/src/shared/ui/public";

type ChairmanAnnouncementFormProps = {
  slug: string;
};

export function ChairmanAnnouncementForm({
  slug,
}: ChairmanAnnouncementFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<"info" | "warning" | "danger">("info");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createChairmanAnnouncement({
        slug,
        title,
        body,
        level,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setTitle("");
      setBody("");
      setLevel("info");
      setSuccess("Оголошення опубліковано; подальше керування — менеджер.");
    });
  }

  return (
    <PubCard className="p-5 sm:p-6 lg:p-7">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="chairman-title"
            className="mb-2 block text-sm font-semibold text-[var(--pub-text)]"
          >
            Заголовок
          </label>
          <PubInput
            id="chairman-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
            disabled={isPending}
          />
        </div>

        <div>
          <label
            htmlFor="chairman-level"
            className="mb-2 block text-sm font-semibold text-[var(--pub-text)]"
          >
            Рівень
          </label>
          <PubSelect
            id="chairman-level"
            value={level}
            onChange={(event) =>
              setLevel(event.target.value as "info" | "warning" | "danger")
            }
            disabled={isPending}
          >
            <option value="info">Інформаційне</option>
            <option value="warning">Важливе</option>
            <option value="danger">Термінове</option>
          </PubSelect>
        </div>

        <div>
          <label
            htmlFor="chairman-body"
            className="mb-2 block text-sm font-semibold text-[var(--pub-text)]"
          >
            Текст оголошення
          </label>
          <PubTextarea
            id="chairman-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={5000}
            rows={9}
            required
            disabled={isPending}
          />
          <div className="mt-2 text-xs text-[var(--pub-text-soft)]">
            {body.length}/5000
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm text-[var(--pub-text)]"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] px-4 py-3 text-sm text-[var(--pub-text)]"
          >
            {success}
          </div>
        ) : null}

        <PubButton
          type="submit"
          variant="primary"
          fullWidth
          loading={isPending}
          disabled={isPending}
        >
          Опублікувати оголошення
        </PubButton>
      </form>
    </PubCard>
  );
}
