"use client";

import { useActionState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";

type EditHeroSectionFormProps = {
  houseId: string;
  houseSlug: string;
  section: {
    id: string;
    title: string | null;
    status: "draft" | "in_review" | "published" | "archived";
    content: Record<string, unknown>;
  };
};

const initialState = {
  error: null,
};

export function EditHeroSectionForm({
  houseId,
  houseSlug,
  section,
}: EditHeroSectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateHouseSection,
    initialState,
  );

  const headline =
    typeof section.content.headline === "string" ? section.content.headline : "";
  const subheadline =
    typeof section.content.subheadline === "string"
      ? section.content.subheadline
      : "";
  const ctaLabel =
    typeof section.content.ctaLabel === "string" ? section.content.ctaLabel : "";

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="sectionId" value={section.id} />
      <input type="hidden" name="houseId" value={houseId} />
      <input type="hidden" name="houseSlug" value={houseSlug} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Назва секції
        </label>
        <input
          name="title"
          type="text"
          defaultValue={section.title ?? ""}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Статус
        </label>
        <select
          name="status"
          defaultValue={section.status}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        >
          <option value="draft">Чернетка</option>
          <option value="in_review">На модерації</option>
          <option value="published">Опубліковано</option>
          <option value="archived">Архів</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Заголовок
        </label>
        <input
          name="headline"
          type="text"
          defaultValue={headline}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Підзаголовок
        </label>
        <textarea
          name="subheadline"
          defaultValue={subheadline}
          rows={4}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Текст CTA
        </label>
        <input
          name="ctaLabel"
          type="text"
          defaultValue={ctaLabel}
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
          {isPending ? "Зберігаємо..." : "Зберегти hero секцію"}
        </button>
      </div>
    </form>
  );
}
