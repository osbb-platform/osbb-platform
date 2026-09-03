import { describe, expect, it } from "vitest";

import {
  compareHousePlanTasks,
  enforceCompletedChronology,
  type HousePlanSortableTask,
} from "../../src/modules/houses/utils/sortHousePlanTasks";
import {
  filterAndSortWorkspaceItems,
  type WorkspaceListSortMode,
} from "../../src/modules/houses/utils/workspaceList";

type RuntimeTask = HousePlanSortableTask & {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  deadlineAt: string | null;
};

const completedA: RuntimeTask = {
  id: "00000000-0000-4000-8000-00000000000a",
  title: "Zulu completed A",
  description: "",
  priority: "high",
  deadlineAt: "2026-10-01T00:00:00.000Z",
  taskStatus: "completed",
  sortOrder: 300,
  updatedAt: "2026-09-03T11:00:00.000Z",
  completedAt: "2026-09-03T10:00:00.000Z",
};

const completedB: RuntimeTask = {
  id: "00000000-0000-4000-8000-00000000000b",
  title: "Alpha completed B",
  description: "",
  priority: "low",
  deadlineAt: "2026-12-01T00:00:00.000Z",
  taskStatus: "completed",
  sortOrder: 100,
  updatedAt: "2026-09-03T09:00:00.000Z",
  completedAt: "2026-09-03T12:00:00.000Z",
};

const completedC: RuntimeTask = {
  id: "00000000-0000-4000-8000-00000000000c",
  title: "Middle completed C",
  description: "",
  priority: "medium",
  deadlineAt: "2026-11-01T00:00:00.000Z",
  taskStatus: "completed",
  sortOrder: 200,
  updatedAt: "2026-09-03T11:00:00.000Z",
  completedAt: null,
};

const plannedD: RuntimeTask = {
  id: "00000000-0000-4000-8000-00000000000d",
  title: "Newest planned D",
  description: "",
  priority: "high",
  deadlineAt: "2026-09-10T00:00:00.000Z",
  taskStatus: "planned",
  sortOrder: 0,
  updatedAt: "2026-09-03T13:00:00.000Z",
  completedAt: null,
};

const allTasks = [completedA, completedB, completedC, plannedD];

function completedIds(tasks: RuntimeTask[]) {
  return tasks
    .filter((task) => task.taskStatus === "completed")
    .map((task) => task.id.slice(-1).toUpperCase());
}

describe("Track A runtime completed chronology invariant", () => {
  it("completed filter orders B -> C -> A by completedAt with updatedAt fallback", () => {
    const actual = enforceCompletedChronology([completedA, completedB, completedC]);

    expect(completedIds(actual)).toEqual(["B", "C", "A"]);
  });

  it.each<WorkspaceListSortMode>(["newest", "oldest", "title_asc"])(
    "all filter preserves B -> C -> A after generic workspace sort: %s",
    (sortMode) => {
      const genericSorted = filterAndSortWorkspaceItems(
        allTasks,
        "",
        sortMode,
      ) as RuntimeTask[];

      const actual = enforceCompletedChronology(genericSorted);

      expect(completedIds(actual)).toEqual(["B", "C", "A"]);
      expect(actual).toContain(plannedD);
    },
  );

  it("priority/deadline/title-like fields cannot influence completed chronology", () => {
    const deliberatelyMisleadingGenericOrder = [
      completedA,
      plannedD,
      completedC,
      completedB,
    ];

    const actual = enforceCompletedChronology(deliberatelyMisleadingGenericOrder);

    expect(completedIds(actual)).toEqual(["B", "C", "A"]);
  });

  it("shared public comparator orders completed B -> C -> A", () => {
    const actual = [completedA, completedB, completedC].sort(compareHousePlanTasks);

    expect(completedIds(actual)).toEqual(["B", "C", "A"]);
  });
});
