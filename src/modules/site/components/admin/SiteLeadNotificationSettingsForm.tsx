"use client";

import { useActionState, useState } from "react";

import {
  type SiteNotificationSettings,
  type UpdateSiteNotificationSettingsState,
} from "@/src/modules/site/actions/siteNotificationSettingsContract";
import { updateSiteNotificationSettings } from "@/src/modules/site/actions/updateSiteNotificationSettings";
import { adminPrimaryButtonClass } from "@/src/shared/ui/admin/adminStyles";

const initialState: UpdateSiteNotificationSettingsState = {
  error: null,
  success: null,
};

type SiteLeadNotificationSettingsFormProps = {
  settings: SiteNotificationSettings;
};

export function SiteLeadNotificationSettingsForm({
  settings,
}: SiteLeadNotificationSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateSiteNotificationSettings,
    initialState,
  );

  const [enabled, setEnabled] = useState(
    settings.leadNotificationsEnabled,
  );
  const [emails, setEmails] = useState(settings.leadNotifyEmails);
  const [draftEmail, setDraftEmail] = useState("");

  function addEmail() {
    const normalized = draftEmail.trim().toLowerCase();

    if (
      !normalized ||
      emails.includes(normalized) ||
      emails.length >= 10
    ) {
      return;
    }

    setEmails((current) => [...current, normalized]);
    setDraftEmail("");
  }

  function removeEmail(email: string) {
    if (emails.length <= 1) {
      return;
    }

    setEmails((current) =>
      current.filter((item) => item !== email),
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="leadNotificationsEnabled"
        value={enabled ? "true" : "false"}
      />

      {emails.map((email) => (
        <input
          key={email}
          type="hidden"
          name="leadNotifyEmails"
          value={email}
        />
      ))}

      <label className="flex items-start gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-4">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-1 h-4 w-4"
        />

        <span>
          <span className="block text-sm font-medium text-[var(--cms-text)]">
            Надсилати email про нові заявки
          </span>
          <span className="mt-1 block text-sm leading-6 text-[var(--cms-text-muted)]">
            Заявка спочатку зберігається в системі, а потім
            надсилається вказаним одержувачам.
          </span>
        </span>
      </label>

      <div>
        <div className="text-sm font-medium text-[var(--cms-text)]">
          Одержувачі
        </div>

        <div className="mt-3 space-y-2">
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between gap-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm text-[var(--cms-text)]">
                {email}
              </span>

              <button
                type="button"
                onClick={() => removeEmail(email)}
                disabled={emails.length <= 1 || isPending}
                className="shrink-0 rounded-[var(--r-md)] border border-[var(--cms-border)] px-3 py-1.5 text-xs font-medium text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Видалити
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={draftEmail}
          onChange={(event) => setDraftEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addEmail();
            }
          }}
          placeholder="manager@example.com"
          disabled={isPending || emails.length >= 10}
          className="min-w-0 flex-1 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-strong)] disabled:opacity-60"
        />

        <button
          type="button"
          onClick={addEmail}
          disabled={
            isPending ||
            !draftEmail.trim() ||
            emails.length >= 10
          }
          className="inline-flex items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-4 py-3 text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-pill-bg)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Додати email
        </button>
      </div>

      <p className="text-xs leading-5 text-[var(--cms-text-muted)]">
        Можна додати до 10 адрес. Секрет поштового сервісу
        зберігатиметься окремо у Vercel і тут не відображатиметься.
      </p>

      {state.error ? (
        <div
          role="alert"
          className="rounded-[var(--r-lg)] border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-[var(--r-lg)] border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] px-4 py-3 text-sm text-[var(--cms-success-text)]"
        >
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || emails.length === 0}
        className={`${adminPrimaryButtonClass} disabled:opacity-60`}
      >
        {isPending
          ? "Зберігаємо..."
          : "Зберегти налаштування"}
      </button>
    </form>
  );
}
