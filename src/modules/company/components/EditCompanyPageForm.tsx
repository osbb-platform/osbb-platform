"use client";

import { useActionState } from "react";
import { updateCompanyPage } from "@/src/modules/company/actions/updateCompanyPage";

type EditCompanyPageFormProps = {
  page: {
    id: string;
    slug: string;
    title: string;
    status: "draft" | "in_review" | "published" | "archived";
    seo_title: string | null;
    seo_description: string | null;
    is_primary: boolean;
    nav_order: number;
    show_in_navigation: boolean;
    show_in_footer: boolean;
  };
};

const initialState = {
  error: null,
};

export function EditCompanyPageForm({ page }: EditCompanyPageFormProps) {
  const [, formAction] = useActionState(
    updateCompanyPage,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" value={page.id} />
      {/* оставляем все существующие поля как есть */}
      <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
        <label className="flex items-start gap-3">
          <input
            name="showInFooter"
            type="checkbox"
            value="true"
            defaultChecked={page.show_in_footer}
            className="mt-1 h-4 w-4"
          />
          <div>
            <div className="text-sm font-medium text-white">
              Показывать страницу в footer navigation
            </div>
          </div>
        </label>
      </div>
    </form>
  );
}
