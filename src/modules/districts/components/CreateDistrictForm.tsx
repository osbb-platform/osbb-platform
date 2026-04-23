"use client";

import { useActionState } from "react";
import { createDistrict } from "@/src/modules/districts/actions/createDistrict";

const initialState = {
  error: null,
  success: null,
};

export function CreateDistrictForm() {
  const [state, formAction, isPending] = useActionState(
    createDistrict,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Назва району
        </label>
        <input
          name="name"
          type="text"
          placeholder="Наприклад, Вознесенівський"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Slug
        </label>
        <input
          name="slug"
          type="text"
          placeholder="voznesenivskyi"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Колір теми
        </label>
        <input
          name="themeColor"
          type="text"
          placeholder="#7c3aed"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      {state.error ? (
        <div className="md:col-span-2 rounded-2xl border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {isPending ? "Створюємо..." : "Створити район"}
        </button>
      </div>
    </form>
  );
}
