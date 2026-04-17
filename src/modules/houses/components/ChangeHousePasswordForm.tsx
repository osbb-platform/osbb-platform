"use client";

import { useActionState, useState } from "react";
import { changeHousePassword } from "@/src/modules/houses/actions/changeHousePassword";

type ChangeHousePasswordFormProps = {
  houseId: string;
  houseSlug: string;
};

type ChangeHousePasswordState = {
  error: string | null;
  successMessage: string | null;
};

const initialState: ChangeHousePasswordState = {
  error: null,
  successMessage: null,
};

function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function ChangeHousePasswordForm({
  houseId,
  houseSlug,
}: ChangeHousePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    changeHousePassword,
    initialState,
  );
  const [newAccessCode, setNewAccessCode] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Текущий код доступа
        </label>
        <input
          name="oldAccessCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="Введите текущий код"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Новый код доступа
        </label>
        <input
          name="newAccessCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={newAccessCode}
          onChange={(event) =>
            setNewAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="Введите новый 6-значный код"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500"
        />

        <button
          type="button"
          onClick={() => setNewAccessCode(generateAccessCode())}
          className="mt-3 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          Сгенерировать автоматически
        </button>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      {state.successMessage ? (
        <div className="rounded-2xl border border-emerald-900 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
          {state.successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
      >
        {isPending ? "Сохраняем..." : "Обновить код доступа"}
      </button>
    </form>
  );
}
