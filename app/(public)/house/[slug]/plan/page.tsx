import { housePlanCopy } from "@/src/shared/publicCopy/house";
import { notFound } from "next/navigation";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHousePlan } from "@/src/modules/houses/services/getPublishedHousePlan";
import { PublicPlanTaskViewer } from "@/src/modules/houses/components/PublicPlanTaskViewer";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ year?: string; mode?: string }>;
};

type PlanTaskStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "archived";

type PlanTaskPriority = "high" | "medium" | "low";
type PlanTaskDateMode = "deadline" | "range";

type PlanTaskImage = {
  id: string;
  path: string;
  url?: string;
  kind: "image";
  createdAt: string;
};

type PlanTaskDocument = {
  id: string;
  path: string;
  url?: string;
  kind: "pdf";
  createdAt: string;
};

type PlanTask = {
  id: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  priority: PlanTaskPriority;
  dateMode: PlanTaskDateMode;
  deadlineAt: string | null;
  startDate: string | null;
  endDate: string | null;
  contractor: string | null;
  images: PlanTaskImage[];
  documents: PlanTaskDocument[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  archiveYear: number | null;
};

// Семантика колонки: ліва смужка + м'який фон через токени.
const activeColumns = [
  {
    key: "planned",
    title: housePlanCopy.columns.planned,
    strip: "bg-[var(--pub-accent)]",
  },
  {
    key: "in_progress",
    title: housePlanCopy.columns.inProgress,
    strip: "bg-[var(--pub-warning-text)]",
  },
  {
    key: "completed",
    title: housePlanCopy.columns.completed,
    strip: "bg-[var(--pub-success-text)]",
  },
] as const;

function getPriorityOrder(priority: PlanTaskPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function getUpdatedAtTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getRelevantDateTimestamp(task: PlanTask) {
  if (task.dateMode === "deadline") {
    return getTimestamp(task.deadlineAt);
  }

  return getTimestamp(task.startDate ?? task.endDate ?? null);
}

function sortPlanTasks(tasks: PlanTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.dateMode !== right.dateMode) {
      return left.dateMode === "deadline" ? -1 : 1;
    }

    const priorityDiff =
      getPriorityOrder(left.priority) - getPriorityOrder(right.priority);

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dateDiff =
      getRelevantDateTimestamp(left) - getRelevantDateTimestamp(right);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return getUpdatedAtTime(right.updatedAt) - getUpdatedAtTime(left.updatedAt);
  });
}

function getArchiveYearValue(task: PlanTask) {
  if (task.archiveYear) {
    return String(task.archiveYear);
  }

  const source = task.archivedAt ?? task.updatedAt;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return String(date.getFullYear());
}

function buildArchiveYearOptions(tasks: PlanTask[]) {
  return Array.from(
    new Set(
      tasks
        .map((task) => getArchiveYearValue(task))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => Number(b) - Number(a));
}

export default async function PublicPlanPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const plan = await getPublishedHousePlan(house.id);

  const tasks: PlanTask[] = plan.tasks
    .map((task) => ({
      id: task.id,
      title: task.content.title,
      description: task.content.description,
      status: task.content.taskStatus,
      priority: task.content.priority,
      dateMode: task.content.dateMode,
      deadlineAt: task.content.deadlineAt,
      startDate: task.content.startDate,
      endDate: task.content.endDate,
      contractor: task.content.contractor,
      images: task.content.images.map((image) => ({
        id: image.fieldKey,
        path: image.path,
        url: image.url ?? undefined,
        kind: "image" as const,
        createdAt: image.createdAt,
      })),
      documents: task.content.documents.map((document) => ({
        id: document.fieldKey,
        path: document.path,
        url: document.url ?? undefined,
        kind: "pdf" as const,
        createdAt: document.createdAt,
      })),
      createdAt: task.content.createdAt,
      updatedAt: task.content.updatedAt,
      archivedAt: task.content.archivedAt,
      archiveYear: task.content.archiveYear,
    }))
    .filter((task) => Boolean(task.title));
  const activeTasks = sortPlanTasks(
    tasks.filter(
      (task) =>
        task.status === "planned" ||
        task.status === "in_progress" ||
        task.status === "completed",
    ),
  );

  const archivedTasks = sortPlanTasks(
    tasks.filter((task) => task.status === "archived"),
  );

  const archiveYears = buildArchiveYearOptions(archivedTasks);
  const selectedMode =
    resolvedSearchParams.mode === "archive" ? "archive" : "active";

  const selectedArchiveYear =
    resolvedSearchParams.year && archiveYears.includes(resolvedSearchParams.year)
      ? resolvedSearchParams.year
      : archiveYears[0] ?? "";

  const visibleArchivedTasks = selectedArchiveYear
    ? archivedTasks.filter(
        (task) => getArchiveYearValue(task) === selectedArchiveYear,
      )
    : archivedTasks;

  const modeTabs: PubFilterTabItem[] = [
    {
      key: "active",
      label: housePlanCopy.tabs.active,
      href: "/plan",
      count: activeTasks.length,
      active: selectedMode === "active",
    },
    {
      key: "archive",
      label: housePlanCopy.tabs.archive,
      href: "/plan?mode=archive",
      count: archivedTasks.length,
      active: selectedMode === "archive",
    },
  ];

  return (
    <div className="grid min-w-0 gap-6">
      <PubSectionHeader
        title={housePlanCopy.page.title}
        description={housePlanCopy.page.description}
      >
        <PubFilterTabs items={modeTabs} ariaLabel={housePlanCopy.page.title} />
      </PubSectionHeader>

      {selectedMode === "active" ? (
        <section>
          <div className="mb-4">
            <h2 className="font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)]">
              {housePlanCopy.active.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--pub-text-muted)]">
              {housePlanCopy.active.description}
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="flex min-w-[980px] gap-4 pb-2">
              {activeColumns.map((column) => {
                const columnItems = activeTasks.filter(
                  (item) => item.status === column.key,
                );

                return (
                  <div
                    key={column.key}
                    className="relative min-h-[420px] w-[320px] overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-4 pl-5 shadow-[var(--pub-shadow-sm)]"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-4 bottom-4 w-1 rounded-[var(--r-pill)] ${column.strip}`}
                    />
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--pub-text)]">
                        {column.title}
                      </h3>
                      <span className="rounded-[var(--r-pill)] bg-[var(--pub-bg-quiet)] px-3 py-1 text-xs font-medium text-[var(--pub-text-muted)]">
                        {columnItems.length}
                      </span>
                    </div>

                    <div className="max-h-[780px] space-y-3 overflow-y-auto pr-1">
                      {columnItems.length === 0 ? (
                        <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-soft)]">
                          Поки задач немає
                        </div>
                      ) : (
                        columnItems.map((task) => (
                          <PublicPlanTaskViewer key={task.id} task={task} houseId={house.id} houseSlug={house.slug} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)]">
                {housePlanCopy.archive.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--pub-text-muted)]">
                Тут зібрані вже завершені роботи по будинку, щоб мешканці могли в будь-який момент переглянути історію виконаних задач.
              </p>
            </div>

            {archiveYears.length > 0 ? (
              <PubFilterTabs
                className="lg:max-w-fit"
                ariaLabel="Рік архіву"
                items={archiveYears.map((year) => ({
                  key: year,
                  label: year,
                  href: `/plan?mode=archive&year=${year}`,
                  count: archivedTasks.filter(
                    (task) => getArchiveYearValue(task) === year,
                  ).length,
                  active: selectedArchiveYear === year,
                }))}
              />
            ) : null}
          </div>

          <div className="mt-2 space-y-5">
            {visibleArchivedTasks.length > 0 ? (
              visibleArchivedTasks.map((task) => (
                <PublicPlanTaskViewer key={task.id} task={task} houseId={house.id} houseSlug={house.slug} />
              ))
            ) : (
              <div className="rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]">
                За обраний період завершених робіт поки немає.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
