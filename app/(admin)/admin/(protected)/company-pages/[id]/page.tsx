import Link from "next/link";
import { notFound } from "next/navigation";
import { EditCompanyHeroSectionForm } from "@/src/modules/company/components/EditCompanyHeroSectionForm";
import { EditCompanyPageForm } from "@/src/modules/company/components/EditCompanyPageForm";
import { getAdminCompanyPageById } from "@/src/modules/company/services/getAdminCompanyPageById";
import { getAdminCompanySectionById } from "@/src/modules/company/services/getAdminCompanySectionById";
import { getAdminCompanySections } from "@/src/modules/company/services/getAdminCompanySections";

type AdminCompanyPageDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function AdminCompanyPageDetailPage({
  params,
}: AdminCompanyPageDetailPageProps) {
  const { id } = await params;

  const page = await getAdminCompanyPageById(id);

  if (!page) {
    notFound();
  }

  const sections = await getAdminCompanySections(page.id);

  const heroSectionMeta =
    sections.find((section) => section.kind === "hero") ?? null;

  const heroSection = heroSectionMeta
    ? await getAdminCompanySectionById(heroSectionMeta.id)
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Company Page Detail
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {page.title}
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
              Детальная страница управления страницей главного сайта компании.
              Здесь можно редактировать как метаданные страницы, так и ее
              контентные секции.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/company-pages"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Назад к списку
            </Link>

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              Открыть главный сайт
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">
              Редактирование страницы компании
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Обновление базовых параметров страницы, статуса публикации и primary-стратегии.
            </p>

            <div className="mt-6">
              <EditCompanyPageForm
                page={{
                  id: page.id,
                  slug: page.slug,
                  title: page.title,
                  status: page.status,
                  seo_title: page.seo_title,
                  seo_description: page.seo_description,
                  is_primary: page.is_primary,
                  nav_order: page.nav_order,
                  show_in_navigation: page.show_in_navigation,
                  show_in_footer: page.show_in_footer,
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">
              Секции страницы компании
            </h2>

            <div className="mt-6 grid gap-4">
              {sections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-slate-400">
                  Секции страницы пока не найдены.
                </div>
              ) : (
                sections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-slate-800 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-white">
                          {section.title ?? "Без названия"}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          kind: {section.kind} · sort: {section.sort_order}
                        </div>
                      </div>

                      <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                        {getStatusLabel(section.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">
              Редактирование hero секции компании
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Управление первым экраном главного сайта компании.
            </p>

            <div className="mt-6">
              {heroSection ? (
                <EditCompanyHeroSectionForm
                  companyPageId={page.id}
                  section={{
                    id: heroSection.id,
                    title: heroSection.title,
                    status: heroSection.status,
                    content: heroSection.content,
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-slate-400">
                  Hero секция компании пока не найдена.
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold text-white">Статус страницы</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-800 px-4 py-3">
                <div className="text-sm text-slate-400">Slug</div>
                <div className="mt-1 font-medium text-white">{page.slug}</div>
              </div>

              <div className="rounded-2xl border border-slate-800 px-4 py-3">
                <div className="text-sm text-slate-400">Статус</div>
                <div className="mt-1 font-medium text-white">
                  {getStatusLabel(page.status)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 px-4 py-3">
                <div className="text-sm text-slate-400">Primary page</div>
                <div className="mt-1 font-medium text-white">
                  {page.is_primary ? "Да, основная страница" : "Нет"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 px-4 py-3">
                <div className="text-sm text-slate-400">Дата публикации</div>
                <div className="mt-1 font-medium text-white">
                  {page.published_at ?? "Не опубликовано"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-6 text-slate-400">
            Следующим шагом сюда можно добавить новые типы секций главного сайта компании и расширить управление содержимым.
          </div>
        </div>
      </div>
    </div>
  );
}
