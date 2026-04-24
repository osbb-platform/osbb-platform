import Link from "next/link";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { CompanyRequestsCarousel } from "@/src/modules/company/components/CompanyRequestsCarousel";
import { getCompanyContactRequests } from "@/src/modules/company/services/getCompanyContactRequests";
import { getCompanySearchStats } from "@/src/modules/company/services/getCompanySearchStats";
import { getCompanyUnreadRequestsCount } from "@/src/modules/company/services/getCompanyUnreadRequestsCount";
import { assertTopLevelAccess } from "@/src/shared/permissions/rbac.guards";

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

export default async function AdminCompanyPagesPage() {
  const currentUser = await getCurrentAdminUser();
  assertTopLevelAccess(currentUser?.role, "companyPages");

  const [unreadRequestsCount, searchStats, requests] = await Promise.all([
    getCompanyUnreadRequestsCount(),
    getCompanySearchStats(),
    getCompanyContactRequests(),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
              Сайт компании
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
              Управление главной страницей
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--cms-text-secondary)]">
              Здесь собраны обращения с главной страницы и базовая статистика поиска домов.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-secondary)] transition hover:bg-[var(--cms-bg-tertiary)]"
            >
              <EyeIcon />
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Заявки: {requests.length}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
              Новые: {unreadRequestsCount}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
              Поиски: {searchStats.totalSearches}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
          <div className="text-sm text-[var(--cms-text-secondary)]">Всего поисков</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--cms-text-primary)]">
            {searchStats.totalSearches}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
          <div className="text-sm text-[var(--cms-text-secondary)]">Без результатов</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--cms-text-primary)]">
            {searchStats.noResults}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5">
          <div className="text-sm text-[var(--cms-text-secondary)]">Клики “Перейти в кабинет”</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--cms-text-primary)]">
            {searchStats.resultClicks}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
          <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
            Популярные поисковые запросы
          </h2>

          <div className="mt-6 grid gap-3">
            {searchStats.topQueries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--cms-border-primary)] px-4 py-4 text-[var(--cms-text-secondary)]">
                Пока нет данных для статистики.
              </div>
            ) : (
              searchStats.topQueries.map((item) => (
                <div
                  key={item.query}
                  className="flex items-center justify-between rounded-2xl border border-[var(--cms-border-primary)] px-4 py-3"
                >
                  <div className="font-medium text-[var(--cms-text-primary)]">{item.query}</div>
                  <div className="text-sm text-[var(--cms-text-secondary)]">{item.total}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-6">
          <h2 className="text-xl font-semibold text-[var(--cms-text-primary)]">
            Заявки на подключение домов
          </h2>

          <div className="mt-6">
            <CompanyRequestsCarousel requests={requests} />
          </div>
        </div>
      </div>
    </div>
  );
}
