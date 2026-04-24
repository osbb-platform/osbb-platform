"use client";

import { useActionState } from "react";
import { createDistrict } from "@/src/modules/districts/actions/createDistrict";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

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
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Назва району
        </label>
        <input
          name="name"
          type="text"
          placeholder="Наприклад, Вознесенівський"
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Slug
        </label>
        <input
          name="slug"
          type="text"
          placeholder="voznesenivskyi"
          className={adminInputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Колір теми
        </label>
        <input
          name="themeColor"
          type="text"
          placeholder="#7c3aed"
          className={adminInputClass}
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
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isPending ? "Створюємо..." : "Створити район"}
        </button>
      </div>
    </form>
  );
}
