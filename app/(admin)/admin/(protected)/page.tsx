import Link from "next/link";
import { AdminDashboardWidgetCard } from "@/src/modules/cms/components/AdminDashboardWidgetCard";
import { AdminDashboardAttentionCarousel } from "@/src/modules/cms/components/AdminDashboardAttentionCarousel";
import { getAdminDashboardV1 } from "@/src/modules/houses/services/getAdminDashboardV1";

function formatDate(value: string | null) {
  if (!value) {
    return "Дата не вказана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Дата не вказана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не вказана";
  }

  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KpiTile({
  label,
  value,
  hint,
  accent = "slate",
}: {
  label: string;
  value: string | number;
  hint: string;
  accent?: "slate" | "amber" | "rose" | "emerald";
}) {
  const accentMap = {
    slate: {
      valueClass: "text-white",
      hintClass: "text-slate-500",
      badgeClass: "border-slate-700 bg-slate-800/80 text-slate-300",
    },
    amber: {
      valueClass: "text-amber-200",
      hintClass: "text-amber-200/70",
      badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    },
    rose: {
      valueClass: "text-rose-200",
      hintClass: "text-rose-200/70",
      badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-200",
    },
    emerald: {
      valueClass: "text-emerald-200",
      hintClass: "text-emerald-200/70",
      badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    },
  } as const;

  const styles = accentMap[accent];

  return (
    <div className="flex min-h-[200px] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-center">
      <div className="flex justify-center">
        <div className={`inline-flex min-h-[30px] max-w-[160px] items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-4 ${styles.badgeClass}`}>
          {label}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className={`text-5xl font-semibold tracking-tight ${styles.valueClass}`}>
          {value}
        </div>

        <div className={`mt-3 text-sm ${styles.hintClass}`}>
          {hint}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
      {text}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboardV1();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <div className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
          Центр керування
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Панель керування
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          Єдина оглядова панель по всіх будинках: що потребує підтвердження, які зміни нещодавно опубліковані, де є незавершені налаштування та куди потрібно швидко перейти для дії.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile
            label="Усього будинків"
            value={dashboard.kpi.totalHouses}
            hint="Активні будинки платформи"
            accent="slate"
          />
          <KpiTile
            label="Будинків із чернетками"
            value={dashboard.kpi.housesWithDrafts}
            hint="Потребують перевірки"
            accent="amber"
          />
          <KpiTile
            label="Будинків без квартир"
            value={dashboard.kpi.housesWithoutApartments}
            hint="Потрібне налаштування"
            accent="rose"
          />
          <KpiTile
            label="Матеріалів на підтвердженні"
            value={dashboard.kpi.draftsForReview}
            hint="Черга адміністратора"
            accent="amber"
          />
          <KpiTile
            label="Публікацій за 7 днів"
            value={dashboard.kpi.recentPublications7d}
            hint="Активність сайту будинку"
            accent="emerald"
          />
        </div>
      </section>

      <AdminDashboardWidgetCard
        title="Потребує уваги"
        subtitle="Найсвіжіші матеріали, що очікують підтвердження адміністратора"
      >
        <AdminDashboardAttentionCarousel items={dashboard.reviewQueue} />
      </AdminDashboardWidgetCard>

      <div className="grid auto-rows-fr gap-6 xl:grid-cols-2">

        <AdminDashboardWidgetCard
          title="Швидкі переходи"
          subtitle="Релевантні будинки та проблемні точки входу"
          scroll
          maxRows={10}
        >
          {dashboard.quickLinks.length > 0 ? (
            <div className="space-y-3">
              {dashboard.quickLinks.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      {item.houseName}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      {item.title}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {item.section}
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Перейти
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Немає швидких переходів для відображення." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Останні публікації"
          subtitle="Останні опубліковані зміни в публічних розділах за 7 днів"
          scroll
          maxRows={10}
        >
          {dashboard.publications.length > 0 ? (
            <div className="space-y-3">
              {dashboard.publications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">
                        {item.houseName}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {item.section}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                      {item.actionLabel}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    {item.summary}
                  </div>

                  <div className="mt-2 line-clamp-2 text-sm font-medium text-white">
                    {item.title}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="За останні 7 днів опублікованих змін не було." />
          )}
        </AdminDashboardWidgetCard>
        <AdminDashboardWidgetCard
          title="Чернетки на підтвердження"
          subtitle="Матеріали, що очікують підтвердження. Спочатку найсвіжіші."
          scroll
          maxRows={10}
        >
          {dashboard.reviewQueue.length > 0 ? (
            <div className="space-y-3">
              {dashboard.reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      {item.houseName}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">
                      {item.title}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {item.section} • {formatDateTime(item.updatedAt)}
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Відкрити
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Зараз немає чернеток на підтвердження." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Проблемні будинки"
          subtitle="Будинки, де є незавершені матеріали або не налаштовані квартири"
          scroll
          maxRows={10}
        >
          {dashboard.problematicHouses.length > 0 ? (
            <div className="space-y-3">
              {dashboard.problematicHouses.map((item) => (
                <div
                  key={item.houseId}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {item.houseName}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.hasDrafts ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100">
                          Є чернетки
                        </span>
                      ) : null}

                      {!item.hasApartments ? (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100">
                          Немає квартир
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Перейти
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Зараз немає будинків, що потребують уваги." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Потрібно налаштувати квартири"
          subtitle="Будинки без квартир"
          scroll
          maxRows={10}
        >
          {dashboard.apartmentSetup.length > 0 ? (
            <div className="space-y-3">
              {dashboard.apartmentSetup.map((item) => (
                <div
                  key={item.houseId}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="text-sm font-medium text-white">
                    {item.houseName}
                  </div>

                  <Link
                    href={item.href}
                    className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    До квартир
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Усі будинки вже мають квартири." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Наповнення будинків"
          subtitle="Зведення по матеріалах у роботі та опублікованих розділах"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiTile
              label="Матеріалів у роботі"
              value={dashboard.contentPipeline.totalDraftSections}
              hint="Чернетки та секції, які ще не доведені до публікації."
            />
            <KpiTile
              label="Опублікованих розділів"
              value={dashboard.contentPipeline.totalPublishedSections}
              hint="Активні розділи, які вже опубліковані та доступні на сайтах будинків."
            />
            <KpiTile
              label="Будинків із матеріалами в роботі"
              value={dashboard.contentPipeline.housesWithDrafts}
              hint="Кількість будинків, у яких є хоча б одна чернетка або незавершений матеріал."
            />
            <KpiTile
              label="Будинків з опублікованим наповненням"
              value={dashboard.contentPipeline.housesWithPublishedContent}
              hint="Кількість будинків, де вже є опубліковані розділи для мешканців."
            />
          </div>

          <div className="mt-4">
            <Link
              href="/admin/houses"
              className="inline-flex items-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Відкрити список будинків
            </Link>
          </div>
        </AdminDashboardWidgetCard>
      </div>
    </div>
  );
}
