"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/integrations/supabase/client/browser";
import { finalizeAdminRegistration } from "@/src/modules/auth/actions/finalizeAdminRegistration";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type AdminPasswordSetupFormProps = {
  mode: "reset" | "complete-registration";
};

type SetupStatus = "idle" | "preparing" | "ready" | "saving";

function readUrlParams() {
  if (typeof window === "undefined") {
    return {
      hashParams: new URLSearchParams(),
      searchParams: new URLSearchParams(),
    };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return {
    hashParams: new URLSearchParams(hash),
    searchParams: new URLSearchParams(window.location.search),
  };
}

export function AdminPasswordSetupForm({
  mode,
}: AdminPasswordSetupFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const preparedRef = useRef(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<SetupStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preparedRef.current) return;
    preparedRef.current = true;

    async function prepareSession() {
      setStatus("preparing");
      setError(null);

      const { hashParams, searchParams } = readUrlParams();

      const code = searchParams.get("code");
      const accessToken =
        hashParams.get("access_token") ?? searchParams.get("access_token");
      const refreshToken =
        hashParams.get("refresh_token") ?? searchParams.get("refresh_token");

      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        if (typeof window !== "undefined") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        setStatus("ready");
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setError("Не вдалося підтвердити посилання. Відкрийте лист ще раз.");
          return;
        }

        if (typeof window !== "undefined") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        setStatus("ready");
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError("Не вдалося підготувати сесію. Відкрийте лист ще раз.");
          return;
        }

        if (typeof window !== "undefined") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        setStatus("ready");
        return;
      }

      setError("Посилання недійсне або застаріло. Відкрийте лист ще раз.");
    }

    prepareSession();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Пароль має містити щонайменше 8 символів.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролі не співпадають.");
      return;
    }

    setStatus("saving");
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Не вдалося зберегти пароль. Спробуйте ще раз.");
      setStatus("ready");
      return;
    }

    if (mode === "complete-registration") {
      const result = await finalizeAdminRegistration();

      if (result?.error) {
        setError(result.error);
        setStatus("ready");
        return;
      }
    }

    router.replace(ROUTES.admin.dashboard);
    router.refresh();
  }

  const title =
    mode === "complete-registration"
      ? "Створення пароля"
      : "Новий пароль";

  const description =
    mode === "complete-registration"
      ? "Створіть пароль, щоб завершити вхід і почати роботу."
      : "Введіть новий пароль для входу.";

  return (
    <div className="w-full rounded-[32px] border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6 shadow-sm">
      <div className="mb-6 inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-4 py-2 text-sm text-[var(--cms-text-muted)] sm:text-lg">
        {mode === "complete-registration"
          ? "Створення пароля"
          : "Відновлення доступу"}
      </div>

      <h1 className="mb-4 text-4xl font-semibold text-[var(--cms-text)] sm:text-6xl">
        {title}
      </h1>

      <p className="mb-8 max-w-md text-lg leading-8 text-[var(--cms-text-muted)] sm:leading-10">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div>
          <label className="mb-3 block text-lg text-[var(--cms-text)] sm:text-xl">
            Пароль
          </label>
          <input
            type="password" autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-base text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-secondary)] disabled:opacity-60"
            placeholder="Не менше 8 символів"
            disabled={status !== "ready"}
          />
        </div>

        <div>
          <label className="mb-3 block text-lg text-[var(--cms-text)] sm:text-xl">
            Підтвердіть пароль
          </label>
          <input
            type="password" autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-base text-[var(--cms-text)] outline-none transition focus:border-[var(--cms-border-secondary)] disabled:opacity-60"
            placeholder="Повторіть пароль"
            disabled={status !== "ready"}
          />
        </div>

        {error ? (
          <div role="alert" className="rounded-3xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-6 py-4 text-lg text-[var(--cms-danger-text)]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status !== "ready"}
          className="rounded-3xl bg-[var(--cms-primary)] px-5 py-3 text-base font-medium text-[var(--cms-primary-contrast)] transition hover:opacity-90 disabled:opacity-50"
        >
          Зберегти пароль
        </button>
      </form>
    </div>
  );
}
