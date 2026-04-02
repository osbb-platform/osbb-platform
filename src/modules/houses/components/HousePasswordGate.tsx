"use client";

import { useActionState } from "react";
import { loginToHouse } from "@/src/modules/houses/actions/loginToHouse";

type HousePasswordGateProps = {
  slug: string;
  houseName: string;
  districtName: string | null;
  districtColor: string;
};

const initialState = {
  error: null,
};

export function HousePasswordGate({
  slug,
  houseName,
  districtName,
  districtColor,
}: HousePasswordGateProps) {
  const [state, formAction, isPending] = useActionState(
    loginToHouse,
    initialState,
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div
            className="mb-4 inline-flex rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: districtColor }}
          >
            {districtName ?? "Дом"}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Вход на сайт дома
          </h1>

          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Для доступа к информации по дому <span className="font-medium text-[var(--foreground)]">{houseName}</span> введите общий пароль для жильцов.
          </p>

          <form action={formAction} className="mt-8 space-y-4">
            <input type="hidden" name="slug" value={slug} />

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Пароль дома
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Введите пароль"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-black"
                autoComplete="current-password"
              />
            </div>

            {state.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-white transition disabled:opacity-60"
              style={{ backgroundColor: districtColor }}
            >
              {isPending ? "Проверяем..." : "Войти"}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-4">
            <div className="text-sm font-medium">Демо-доступ</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              Для текущего тестового дома пароль: <span className="font-medium text-[var(--foreground)]">demo123</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
