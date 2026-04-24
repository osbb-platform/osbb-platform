"use client";

import { useActionState } from "react";
import { updateHouseSection } from "@/src/modules/houses/actions/updateHouseSection";
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminTextLabelClass,
} from "@/src/shared/ui/admin/adminStyles";

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
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Назва секції
        </label>
        <input
          name="title"
          type="text"
          defaultValue={section.title ?? ""}
          className={adminInputClass}
        />
      </div>

      <div>
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Статус
        </label>
        <select
          name="status"
          defaultValue={section.status}
          className={adminInputClass}
        >
          <option value="draft">Чернетка</option>
          <option value="in_review">На модерації</option>
          <option value="published">Опубліковано</option>
          <option value="archived">Архів</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Заголовок
        </label>
        <input
          name="headline"
          type="text"
          defaultValue={headline}
          className={adminInputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Підзаголовок
        </label>
        <textarea
          name="subheadline"
          defaultValue={subheadline}
          rows={4}
          className={adminInputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={`mb-2 block ${adminTextLabelClass}`}>
          Текст CTA
        </label>
        <input
          name="ctaLabel"
          type="text"
          defaultValue={ctaLabel}
          className={adminInputClass}
        />
      </div>

      {state.error ? (
        <div className="md:col-span-2 rounded-2xl border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] px-4 py-3 text-sm text-[var(--cms-danger-text)]">
          {state.error}
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className={`${adminPrimaryButtonClass} disabled:opacity-60`}
        >
          {isPending ? "Зберігаємо..." : "Зберегти hero секцію"}
        </button>
      </div>
    </form>
  );
}
