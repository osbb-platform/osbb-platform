import Link from "next/link";
import { CreateCompanyPageForm } from "@/src/modules/company/components/CreateCompanyPageForm";
import { getAdminCompanyPages } from "@/src/modules/company/services/getAdminCompanyPages";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

function getStatusLabel(status: string) {
  switch (status) {
    case "published":
      return "Опубликовано";
    case "draft":
      return "Черновик";
    case "in_review":
      return "На модерации";
    case "archived":
      return "Архив";
    default:
      return status;
  }
}

export default async function AdminCompanyPagesPage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "companyPages");

  const pages = await getAdminCompanyPages();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
          Company Pages
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Сайт компании
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
          Управление страницами сайта управляющей компании.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white">
          Создать страницу сайта
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Новая страница создается как черновик и позже может быть опубликована.
        </p>

        <div className="mt-6">
          <CreateCompanyPageForm />
        </div>
      </div>

      <div className="grid gap-4">
        {pages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-400">
            Сайт компании пока не найдены.
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xl font-semibold text-white">
                      {page.title}
                    </div>

                    {page.is_primary ? (
                      <div className="inline-flex rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-300">
                        Основная страница
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-2 text-sm text-slate-400">
                    slug: {page.slug}
                  </div>

                  <div className="mt-3 inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                    {getStatusLabel(page.status)}
                  </div>

                  <div className="mt-5">
                    <Link
                      href={`/admin/company-pages/${page.id}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Управление страницей
                    </Link>
                  </div>
                </div>

                <div className="min-w-[280px] space-y-3">
                  <div className="rounded-2xl border border-slate-800 px-4 py-3">
                    <div className="text-sm text-slate-400">SEO title</div>
                    <div className="mt-1 font-medium text-white">
                      {page.seo_title ?? "Не указано"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 px-4 py-3">
                    <div className="text-sm text-slate-400">SEO description</div>
                    <div className="mt-1 font-medium text-white">
                      {page.seo_description ?? "Не указано"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
