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
    <div className="w-full rounded-[32px] border border-white/10 bg-[#09162f] p-6 shadow-sm">
      <div className="mb-6 inline-flex rounded-full bg-white/8 px-4 py-2 text-sm text-white/80 sm:text-lg">
        {mode === "complete-registration"
          ? "Створення пароля"
          : "Відновлення доступу"}
      </div>

      <h1 className="mb-4 text-4xl font-semibold text-white sm:text-6xl">
        {title}
      </h1>

      <p className="mb-8 max-w-md text-lg leading-8 text-[#94A3B8]  sm:leading-10">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div>
          <label className="mb-3 block text-lg text-white sm:text-xl">
            Пароль
          </label>
          <input
            type="password" autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-3xl border border-[#22345A] bg-[#020817] px-4 py-3 text-base text-white outline-none "
            placeholder="Не менше 8 символів"
            disabled={status !== "ready"}
          />
        </div>

        <div>
          <label className="mb-3 block text-lg text-white sm:text-xl">
            Підтвердіть пароль
          </label>
          <input
            type="password" autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-3xl border border-[#22345A] bg-[#020817] px-4 py-3 text-base text-white outline-none "
            placeholder="Повторіть пароль"
            disabled={status !== "ready"}
          />
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500 bg-red-500/10 px-6 py-4 text-lg text-red-300 ">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status !== "ready"}
          className="rounded-3xl bg-white px-5 py-3 text-base font-medium text-[#0B1120] disabled:opacity-50 "
        >
          Зберегти пароль
        </button>
      </form>
    </div>
  );
}
