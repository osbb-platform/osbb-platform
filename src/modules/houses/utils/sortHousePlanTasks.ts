export type HousePlanSortableTask = {
  id: string;
  taskStatus: "planned" | "in_progress" | "completed" | "archived";
  sortOrder: number;
  updatedAt: string;
  completedAt: string | null;
};

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function compareHousePlanTasks(left: HousePlanSortableTask, right: HousePlanSortableTask) {
  const leftCompleted = left.taskStatus === "completed";
  const rightCompleted = right.taskStatus === "completed";

  if (leftCompleted && rightCompleted) {
    const leftCompletedTime = toTime(left.completedAt ?? left.updatedAt);
    const rightCompletedTime = toTime(right.completedAt ?? right.updatedAt);
    if (leftCompletedTime !== rightCompletedTime) {
      return rightCompletedTime - leftCompletedTime;
    }
    return right.id.localeCompare(left.id);
  }

  if (leftCompleted !== rightCompleted) return leftCompleted ? 1 : -1;
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;

  const updatedDifference = toTime(right.updatedAt) - toTime(left.updatedAt);
  if (updatedDifference !== 0) return updatedDifference;
  return left.id.localeCompare(right.id);
}

export function enforceCompletedChronology<T extends HousePlanSortableTask>(tasks: T[]): T[] {
  const completed = tasks
    .filter((task) => task.taskStatus === "completed")
    .sort(compareHousePlanTasks);

  let completedIndex = 0;

  return tasks.map((task) => {
    if (task.taskStatus !== "completed") return task;

    const replacement = completed[completedIndex];
    completedIndex += 1;
    return replacement;
  });
}
