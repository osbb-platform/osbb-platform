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
          setError("Не удалось подтвердить ссылку из письма. Откройте письмо заново.");
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
          setError("Не удалось подготовить сессию. Откройте письмо заново.");
          return;
        }

        if (typeof window !== "undefined") {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        setStatus("ready");
        return;
      }

      setError("Ссылка недействительна или истекла. Откройте письмо заново.");
    }

    prepareSession();
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setStatus("saving");
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
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
      ? "Завершение регистрации"
      : "Смена пароля";

  const description =
    mode === "complete-registration"
      ? "Здесь сотрудник завершает первый вход и задает личный пароль для дальнейшей работы в платформе."
      : "Задайте новый пароль для безопасного входа в систему.";

  return (
    <div className="w-full rounded-[32px] border border-white/10 bg-[#09162f] p-8 shadow-sm sm:p-10">
      <div className="mb-6 inline-flex rounded-full bg-white/8 px-4 py-2 text-sm text-white/80 sm:text-lg">
        {mode === "complete-registration"
          ? "Complete registration"
          : "Reset password"}
      </div>

      <h1 className="mb-4 text-4xl font-semibold text-white sm:text-6xl">
        {title}
      </h1>

      <p className="mb-8 max-w-4xl text-lg leading-8 text-[#94A3B8] sm:text-2xl sm:leading-10">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        <div>
          <label className="mb-3 block text-lg text-white sm:text-xl">
            Новый пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-3xl border border-[#22345A] bg-[#020817] px-6 py-5 text-xl text-white outline-none sm:text-2xl"
            placeholder="Минимум 8 символов"
            disabled={status !== "ready"}
          />
        </div>

        <div>
          <label className="mb-3 block text-lg text-white sm:text-xl">
            Подтвердите пароль
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-3xl border border-[#22345A] bg-[#020817] px-6 py-5 text-xl text-white outline-none sm:text-2xl"
            placeholder="Повторите пароль"
            disabled={status !== "ready"}
          />
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500 bg-red-500/10 px-6 py-4 text-lg text-red-300 sm:text-2xl">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status !== "ready"}
          className="rounded-3xl bg-white px-10 py-5 text-xl font-medium text-[#0B1120] disabled:opacity-50 sm:text-2xl"
        >
          Сохранить пароль
        </button>
      </form>
    </div>
  );
}
