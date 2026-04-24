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
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
              Company Page Detail
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
              {page.title}
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--cms-text-secondary)]">
              Детальная страница управления страницей главного сайта компании.
              Здесь можно редактировать как метаданные страницы, так и ее
              контентные секции.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/company-pages"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] px-4 py-2 text-sm font-medium text-[var(--cms-text-primary)] transition hover:bg-[var(--cms-bg-secondary)]"
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
          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
              Редактирование страницы компании
            </h2>

            <p className="mt-2 text-sm text-[var(--cms-text-secondary)]">
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

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
              Секции страницы компании
            </h2>

            <div className="mt-6 grid gap-4">
              {sections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] px-4 py-4 text-[var(--cms-text-secondary)]">
                  Секции страницы пока не найдены.
                </div>
              ) : (
                sections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-[var(--cms-border-primary)] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-[var(--cms-text-primary)]">
                          {section.title ?? "Без названия"}
                        </div>
                        <div className="mt-1 text-sm text-[var(--cms-text-secondary)]">
                          kind: {section.kind} · sort: {section.sort_order}
                        </div>
                      </div>

                      <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
                        {getStatusLabel(section.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
              Редактирование hero секции компании
            </h2>

            <p className="mt-2 text-sm text-[var(--cms-text-secondary)]">
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
                <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] px-4 py-4 text-[var(--cms-text-secondary)]">
                  Hero секция компании пока не найдена.
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
            <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">Статус страницы</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3">
                <div className="text-sm text-[var(--cms-text-secondary)]">Slug</div>
                <div className="mt-1 font-medium text-[var(--cms-text-primary)]">{page.slug}</div>
              </div>

              <div className="rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3">
                <div className="text-sm text-[var(--cms-text-secondary)]">Статус</div>
                <div className="mt-1 font-medium text-[var(--cms-text-primary)]">
                  {getStatusLabel(page.status)}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3">
                <div className="text-sm text-[var(--cms-text-secondary)]">Primary page</div>
                <div className="mt-1 font-medium text-[var(--cms-text-primary)]">
                  {page.is_primary ? "Да, основная страница" : "Нет"}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3">
                <div className="text-sm text-[var(--cms-text-secondary)]">Дата публикации</div>
                <div className="mt-1 font-medium text-[var(--cms-text-primary)]">
                  {page.published_at ?? "Не опубликовано"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-dashed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] p-6 text-[var(--cms-text-secondary)]">
            Следующим шагом сюда можно добавить новые типы секций главного сайта компании и расширить управление содержимым.
          </div>
        </div>
      </div>
    </div>
  );
}
