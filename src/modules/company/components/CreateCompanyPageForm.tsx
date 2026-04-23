"use client";

import { useFormStatus } from "react-dom";
import { createCompanyPage } from "@/src/modules/company/actions/createCompanyPage";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
    >
      {pending ? "Створюємо..." : "Створити сторінку компанії"}
    </button>
  );
}

export function CreateCompanyPageForm() {
  return (
    <form action={createCompanyPage} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          Назва сторінки
        </label>
        <input
          name="title"
          type="text"
          placeholder="О компании"
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
          placeholder="about"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          SEO title
        </label>
        <input
          name="seoTitle"
          type="text"
          placeholder="SEO title"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200">
          SEO description
        </label>
        <input
          name="seoDescription"
          type="text"
          placeholder="SEO description"
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
        />
      </div>

      <div className="md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
