import Link from "next/link";
import { AdminDashboardWidgetCard } from "@/src/modules/cms/components/AdminDashboardWidgetCard";
import { AdminDashboardAttentionCarousel } from "@/src/modules/cms/components/AdminDashboardAttentionCarousel";
import { getAdminDashboardV1 } from "@/src/modules/houses/services/getAdminDashboardV1";

function formatDate(value: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Дата не указана";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дата не указана";
  }

  return date.toLocaleString("ru-RU", {
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
          Центр управления
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Панель управления
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          Единая обзорная панель по всем домам: что требует подтверждения, какие изменения недавно опубликованы, где есть незавершенные настройки и куда нужно быстро перейти для действия.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiTile
            label="Всего домов"
            value={dashboard.kpi.totalHouses}
            hint="Активные дома платформы"
            accent="slate"
          />
          <KpiTile
            label="Домов с черновиками"
            value={dashboard.kpi.housesWithDrafts}
            hint="Требуют проверки"
            accent="amber"
          />
          <KpiTile
            label="Домов без квартир"
            value={dashboard.kpi.housesWithoutApartments}
            hint="Нужна настройка"
            accent="rose"
          />
          <KpiTile
            label="Материалов на подтверждении"
            value={dashboard.kpi.draftsForReview}
            hint="Очередь администратора"
            accent="amber"
          />
          <KpiTile
            label="Публикаций за 7 дней"
            value={dashboard.kpi.recentPublications7d}
            hint="Активность сайта дома"
            accent="emerald"
          />
        </div>
      </section>

      <AdminDashboardWidgetCard
        title="Требует внимания"
        subtitle="Самые свежие материалы, ожидающие подтверждения администратора"
      >
        <AdminDashboardAttentionCarousel items={dashboard.reviewQueue} />
      </AdminDashboardWidgetCard>

      <div className="grid auto-rows-fr gap-6 xl:grid-cols-2">

        <AdminDashboardWidgetCard
          title="Быстрые переходы"
          subtitle="Релевантные дома и проблемные точки входа"
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
            <EmptyState text="Нет быстрых переходов для отображения." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Последние публикации"
          subtitle="Последние опубликованные изменения в публичных разделах за 7 дней"
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
            <EmptyState text="За последние 7 дней опубликованных изменений не было." />
          )}
        </AdminDashboardWidgetCard>
        <AdminDashboardWidgetCard
          title="Черновики на подтверждение"
          subtitle="Материалы, ожидающие подтверждения. Сначала самые свежие."
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
                    Открыть
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Сейчас нет черновиков на подтверждение." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Проблемные дома"
          subtitle="Дома, где есть незавершенные материалы или не настроены квартиры"
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
                          Есть черновики
                        </span>
                      ) : null}

                      {!item.hasApartments ? (
                        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-100">
                          Нет квартир
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
            <EmptyState text="Сейчас нет домов, требующих внимания." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Нужно настроить квартиры"
          subtitle="Дома без квартир"
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
                    К квартирам
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Все дома уже имеют квартиры." />
          )}
        </AdminDashboardWidgetCard>

        <AdminDashboardWidgetCard
          title="Наполнение домов"
          subtitle="Сводка по материалам в работе и опубликованным разделам"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiTile
              label="Материалов в работе"
              value={dashboard.contentPipeline.totalDraftSections}
              hint="Черновики и секции, которые ещё не доведены до публикации."
            />
            <KpiTile
              label="Опубликованных разделов"
              value={dashboard.contentPipeline.totalPublishedSections}
              hint="Активные разделы, которые уже опубликованы и доступны на сайтах домов."
            />
            <KpiTile
              label="Домов с материалами в работе"
              value={dashboard.contentPipeline.housesWithDrafts}
              hint="Количество домов, в которых есть хотя бы один черновик или незавершённый материал."
            />
            <KpiTile
              label="Домов с опубликованным наполнением"
              value={dashboard.contentPipeline.housesWithPublishedContent}
              hint="Количество домов, где уже есть опубликованные разделы для жителей."
            />
          </div>

          <div className="mt-4">
            <Link
              href="/admin/houses"
              className="inline-flex items-center rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Открыть список домов
            </Link>
          </div>
        </AdminDashboardWidgetCard>
      </div>
    </div>
  );
}
