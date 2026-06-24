"use client";

import { useFormStatus } from "react-dom";
import { createCompanyPage } from "@/src/modules/company/actions/createCompanyPage";
import { adminPrimaryButtonClass } from "@/src/shared/ui/admin/adminStyles";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${adminPrimaryButtonClass} disabled:opacity-60`}
    >
      {pending ? "Створюємо..." : "Створити сторінку компанії"}
    </button>
  );
}

export function CreateCompanyPageForm() {
  return (
    <form action={createCompanyPage} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
          Назва сторінки
        </label>
        <input
          name="title"
          type="text"
          placeholder="О компании"
          className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
          Slug
        </label>
        <input
          name="slug"
          type="text"
          placeholder="about"
          className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
          SEO title
        </label>
        <input
          name="seoTitle"
          type="text"
          placeholder="SEO title"
          className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--cms-text)]">
          SEO description
        </label>
        <input
          name="seoDescription"
          type="text"
          placeholder="SEO description"
          className="w-full rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] px-4 py-3 text-[var(--cms-text)] outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
