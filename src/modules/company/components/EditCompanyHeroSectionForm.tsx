"use client";

import { useActionState } from "react";
import { updateCompanySection } from "@/src/modules/company/actions/updateCompanySection";
import { adminPrimaryButtonClass } from "@/src/shared/ui/admin/adminStyles";

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
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
          Назва секції
        </label>
        <input
          name="title"
          type="text"
          defaultValue={section.title ?? ""}
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
          Статус
        </label>
        <select
          name="status"
          defaultValue={section.status}
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none"
        >
          <option value="draft">Чернетка</option>
          <option value="in_review">На модерації</option>
          <option value="published">Опубліковано</option>
          <option value="archived">Архів</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
          Заголовок
        </label>
        <input
          name="headline"
          type="text"
          defaultValue={headline}
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
          Підзаголовок
        </label>
        <textarea
          name="subheadline"
          defaultValue={subheadline}
          rows={4}
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text-primary)]">
          Текст CTA
        </label>
        <input
          name="ctaLabel"
          type="text"
          defaultValue={ctaLabel}
          className="w-full rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] px-4 py-3 text-[var(--cms-text-primary)] outline-none"
        />
      </div>

      {state.error ? (
        <div className="md:col-span-2 rounded-2xl border px-4 py-3 text-sm border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isPending ? "Зберігаємо..." : "Зберегти hero секцію компанії"}
        </button>
      </div>
    </form>
  );
}
