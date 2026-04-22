import { housePlanCopy } from "@/src/shared/publicCopy/house";
import Link from "next/link";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { PublicPlanTaskViewer } from "@/src/modules/houses/components/PublicPlanTaskViewer";
import { PublicPlanArchiveMonthSelect } from "@/src/modules/houses/components/PublicPlanArchiveMonthSelect";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string; mode?: string }>;
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
};

const activeColumns = [
  {
    key: "planned",
    title: housePlanCopy.columns.planned,
    style: "border-[#85e874]/30 bg-[#85e874]/10",
  },
  {
    key: "in_progress",
    title: housePlanCopy.columns.inProgress,
    style: "border-amber-200 bg-amber-50",
  },
  {
    key: "completed",
    title: housePlanCopy.columns.completed,
    style: "border-[#5475e3]/30 bg-[#5475e3]/10",
  },
] as const;

function createTaskId() {
  return `plan-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePlanTasks(value: unknown): PlanTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const now = new Date(Date.now() - index * 1000).toISOString();

      return {
        id:
          typeof raw.id === "string" && raw.id.trim()
            ? raw.id.trim()
            : createTaskId(),
        title: String(raw.title ?? "").trim(),
        description: String(raw.description ?? "").trim(),
        status:
          raw.status === "planned" ||
          raw.status === "in_progress" ||
          raw.status === "completed" ||
          raw.status === "archived"
            ? raw.status
            : "draft",
        priority:
          raw.priority === "high" ||
          raw.priority === "medium" ||
          raw.priority === "low"
            ? raw.priority
            : "medium",
        dateMode: raw.dateMode === "range" ? "range" : "deadline",
        deadlineAt:
          typeof raw.deadlineAt === "string" ? raw.deadlineAt : null,
        startDate:
          typeof raw.startDate === "string" ? raw.startDate : null,
        endDate:
          typeof raw.endDate === "string" ? raw.endDate : null,
        contractor:
          typeof raw.contractor === "string" ? raw.contractor.trim() : null,
        images: Array.isArray(raw.images)
          ? (raw.images as PlanTaskImage[])
          : [],
        documents: Array.isArray(raw.documents)
          ? (raw.documents as PlanTaskDocument[])
          : [],
        createdAt:
          typeof raw.createdAt === "string" && raw.createdAt
            ? raw.createdAt
            : now,
        updatedAt:
          typeof raw.updatedAt === "string" && raw.updatedAt
            ? raw.updatedAt
            : now,
        archivedAt:
          typeof raw.archivedAt === "string" && raw.archivedAt
            ? raw.archivedAt
            : null,
      } satisfies PlanTask;
    })
    .filter((item): item is PlanTask => item !== null && Boolean(item.title));
}

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

function getArchiveMonthValue(task: PlanTask) {
  const source = task.archivedAt ?? task.updatedAt;
  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getArchiveMonthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(`${year}-${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(housePlanCopy.archive.locale, {
    month: "long",
    year: "numeric",
  });
}

function buildArchiveMonthOptions(tasks: PlanTask[]) {
  return Array.from(
    new Set(
      tasks
        .map((task) => getArchiveMonthValue(task))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => b.localeCompare(a));
}



export default async function PublicPlanPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  const { house, sections } =
    await getPublishedHomeSectionsBySlug(slug);

  const districtColor = house.district?.theme_color ?? "#16a34a";

  const planSection = sections.find((section) => section.kind === "plan");

  const content =
    planSection &&
    typeof planSection.content === "object" &&
    planSection.content
      ? (planSection.content as Record<string, unknown>)
      : {};

  const tasks = normalizePlanTasks(content.items);
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

  const archiveMonths = buildArchiveMonthOptions(archivedTasks);
  const selectedMode =
    resolvedSearchParams.mode === "archive" ? "archive" : "active";

  const selectedArchiveMonth =
    resolvedSearchParams.month && archiveMonths.includes(resolvedSearchParams.month)
      ? resolvedSearchParams.month
      : archiveMonths[0] ?? "";

  const visibleArchivedTasks = selectedArchiveMonth
    ? archivedTasks.filter(
        (task) => getArchiveMonthValue(task) === selectedArchiveMonth,
      )
    : archivedTasks;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[36px] border border-[#E4DBD1] bg-[#F3EEE8] p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1F2A37] sm:text-5xl lg:text-6xl">
            {housePlanCopy.page.title}
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#5B6B7C] sm:text-lg">
            {housePlanCopy.page.description}
          </p>
        </div>

        <div className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-sm">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/house/${slug}/plan`}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                selectedMode === "active"
                  ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                  : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
              }`}
              style={selectedMode === "active" ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", "borderColor": districtColor } as React.CSSProperties : undefined}
            >
              <span>{housePlanCopy.tabs.active}</span>
              <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                selectedMode === "active" ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]" : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
              }`}>
                {activeTasks.length}
              </span>
            </Link>

            <Link
              href={`/house/${slug}/plan?mode=archive`}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                selectedMode === "archive"
                  ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                  : "border border-[#D8CEC2] bg-[#F6F2EC] text-[#2A3642] hover:bg-[#F0E9E1]"
              }`}
              style={selectedMode === "archive" ? { "--tab-active-bg": `${districtColor}20`, "--tab-active-text": "#1F2A37", "borderColor": districtColor } as React.CSSProperties : undefined}
            >
              <span>{housePlanCopy.tabs.archive}</span>
              <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                selectedMode === "archive" ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]" : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
              }`}>
                {archivedTasks.length}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {selectedMode === "active" ? (
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {housePlanCopy.active.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {housePlanCopy.active.description}
            </p>
          </div>
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
                  className={`min-h-[420px] w-[320px] rounded-[28px] border p-4 ${column.style}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {column.title}
                    </h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#5B6B7C]">
                      {columnItems.length}
                    </span>
                  </div>

                  <div className="max-h-[780px] space-y-3 overflow-y-auto pr-1">
                    {columnItems.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#DDD4CA] bg-white p-4 text-sm text-slate-400">
                        Пока задач нет
                      </div>
                    ) : (
                      columnItems.map((task) => (
                        <PublicPlanTaskViewer key={task.id} task={task} />
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
      <section className="mt-8">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#1F2A37]">
              {housePlanCopy.archive.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Здесь собраны уже завершенные работы по дому, чтобы жители могли в любой момент посмотреть историю выполненных задач.
            </p>
          </div>

          <form method="get" className="w-full max-w-xs">
            <input type="hidden" name="mode" value="archive" />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-900">
                Месяц архива
              </span>
              <PublicPlanArchiveMonthSelect
                name="month"
                defaultValue={selectedArchiveMonth}
                options={archiveMonths.map((month) => ({
                  value: month,
                  label: getArchiveMonthLabel(month),
                }))}
                emptyLabel={housePlanCopy.archive.empty}
                className="w-full rounded-2xl border border-[#E4DBD1] bg-[#F3EEE8] px-4 py-3 text-sm text-slate-900 outline-none transition"
              />
            </label>
          </form>
        </div>

        <div className="mt-6 space-y-5">
          {visibleArchivedTasks.length > 0 ? (
            visibleArchivedTasks.map((task) => (
              <PublicPlanTaskViewer key={task.id} task={task} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/60 p-4 text-sm text-[var(--muted)]">
              За выбранный период завершенных работ пока нет.
            </div>
          )}
        </div>
      </section>

      )}
    </section>
  );
}
