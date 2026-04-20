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
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Сайт компании
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
              Управление главной страницей
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
              Здесь собраны обращения с главной страницы и базовая статистика поиска домов.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700"
            >
              <EyeIcon />
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-300">
              Заявки: {requests.length}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-orange-900/40 px-3 py-1 text-xs font-medium text-orange-300">
              Новые: {unreadRequestsCount}
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              Поиски: {searchStats.totalSearches}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Всего поисков</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {searchStats.totalSearches}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Без результатов</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {searchStats.noResults}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Клики “Перейти в кабинет”</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {searchStats.resultClicks}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
            Популярные поисковые запросы
          </h2>

          <div className="mt-6 grid gap-3">
            {searchStats.topQueries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-slate-400">
                Пока нет данных для статистики.
              </div>
            ) : (
              searchStats.topQueries.map((item) => (
                <div
                  key={item.query}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 px-4 py-3"
                >
                  <div className="font-medium text-white">{item.query}</div>
                  <div className="text-sm text-slate-400">{item.total}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-white">
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
