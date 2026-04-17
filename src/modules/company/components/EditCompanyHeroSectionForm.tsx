"use client";

import { useActionState } from "react";
import { updateCompanySection } from "@/src/modules/company/actions/updateCompanySection";

type EditCompanyHeroSectionFormProps = {
  companyPageId: string;
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

export function EditCompanyHeroSectionForm({
  companyPageId,
  section,
}: EditCompanyHeroSectionFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateCompanySection,
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
      <input type="hidden" name="companyPageId" value={companyPageId} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Название секции
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
          <option value="draft">Черновик</option>
          <option value="in_review">На модерации</option>
          <option value="published">Опубликовано</option>
          <option value="archived">Архив</option>
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
          Подзаголовок
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
          {isPending ? "Сохраняем..." : "Сохранить hero секцию компании"}
        </button>
      </div>
    </form>
  );
}
