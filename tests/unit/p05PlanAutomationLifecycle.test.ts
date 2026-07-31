import { describe, expect, it } from "vitest";

import {
  calculateAutomaticCatchUp,
  createAutomaticPlanTransition,
  createManualPlanTransition,
  getNextAutomaticPlanStatus,
  pausePlanAutomation,
  resetPlanAutomationInterval,
  resumePlanAutomation,
} from "../../src/modules/content-engine/v2/handlers/plan/automationLifecycle";

describe("P05 T5.2b-1 automation lifecycle core", () => {
  it("uses the fixed automatic status sequence", () => {
    expect(getNextAutomaticPlanStatus("planned")).toBe("in_progress");
    expect(getNextAutomaticPlanStatus("in_progress")).toBe("completed");
    expect(getNextAutomaticPlanStatus("completed")).toBe("archived");
    expect(getNextAutomaticPlanStatus("archived")).toBeNull();
  });

  it("starts a new full interval after a manual transition", () => {
    expect(
      resetPlanAutomationInterval({
        enabled: true,
        intervalDays: 10,
        occurredAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toEqual({
      automationAnchorAt: "2026-07-23T08:00:00.000Z",
      automationNextDueAt: "2026-08-02T08:00:00.000Z",
      automationPausedAt: null,
    });
  });

  it("does not disable automation when pausing", () => {
    expect(
      pausePlanAutomation({
        enabled: true,
        pausedAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: "2026-07-23T08:00:00.000Z",
    });
  });

  it("resume starts a new full interval", () => {
    expect(
      resumePlanAutomation({
        enabled: true,
        intervalDays: 7,
        resumedAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toEqual({
      automationAnchorAt: "2026-07-23T08:00:00.000Z",
      automationNextDueAt: "2026-07-30T08:00:00.000Z",
      automationPausedAt: null,
    });
  });

  it("journals a manual skip without changing the fixed next rule", () => {
    expect(
      createManualPlanTransition({
        fromStatus: "planned",
        toStatus: "completed",
        executedAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toEqual({
      fromStatus: "planned",
      toStatus: "completed",
      dueAt: null,
      executedAt: "2026-07-23T08:00:00.000Z",
      kind: "manual",
    });

    expect(getNextAutomaticPlanStatus("completed")).toBe("archived");
  });

  it("does not journal a no-op manual transition", () => {
    expect(
      createManualPlanTransition({
        fromStatus: "planned",
        toStatus: "planned",
        executedAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("creates an automatic transition with its due timestamp", () => {
    expect(
      createAutomaticPlanTransition({
        fromStatus: "in_progress",
        dueAt: "2026-07-23T08:00:00.000Z",
        executedAt: "2026-07-23T09:00:00.000Z",
      }),
    ).toEqual({
      fromStatus: "in_progress",
      toStatus: "completed",
      dueAt: "2026-07-23T08:00:00.000Z",
      executedAt: "2026-07-23T09:00:00.000Z",
      kind: "automatic",
    });
  });

  it("catches up every missed transition in order", () => {
    expect(
      calculateAutomaticCatchUp({
        currentStatus: "planned",
        firstDueAt: "2026-07-01T08:00:00.000Z",
        executedAt: "2026-07-23T08:00:00.000Z",
        intervalDays: 7,
      }),
    ).toEqual([
      {
        fromStatus: "planned",
        toStatus: "in_progress",
        dueAt: "2026-07-01T08:00:00.000Z",
        executedAt: "2026-07-23T08:00:00.000Z",
        kind: "automatic",
      },
      {
        fromStatus: "in_progress",
        toStatus: "completed",
        dueAt: "2026-07-08T08:00:00.000Z",
        executedAt: "2026-07-23T08:00:00.000Z",
        kind: "automatic",
      },
      {
        fromStatus: "completed",
        toStatus: "archived",
        dueAt: "2026-07-15T08:00:00.000Z",
        executedAt: "2026-07-23T08:00:00.000Z",
        kind: "automatic",
      },
    ]);
  });

  it("stops catch-up after archived", () => {
    expect(
      calculateAutomaticCatchUp({
        currentStatus: "archived",
        firstDueAt: "2026-07-01T08:00:00.000Z",
        executedAt: "2026-07-23T08:00:00.000Z",
        intervalDays: 7,
      }),
    ).toEqual([]);
  });

  it("returns cleared schedule when automation is disabled", () => {
    expect(
      resetPlanAutomationInterval({
        enabled: false,
        intervalDays: null,
        occurredAt: "2026-07-23T08:00:00.000Z",
      }),
    ).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    });
  });
});
