import { describe, expect, it } from "vitest";

import {
  resolveAutomationScheduleOnUpdate,
} from "../../src/modules/content-engine/v2/handlers/plan/automationLifecycle";

const NOW = "2026-08-19T03:20:00.000Z";

describe("P11 plan automation schedule on update", () => {
  it("clears schedule when automation is disabled", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: false,
        intervalDays: null,
        lifecycleStatus: "published",
        previous: {
          enabled: true,
          intervalDays: 7,
          anchorAt: "2026-08-10T03:20:00.000Z",
          nextDueAt: "2026-08-17T03:20:00.000Z",
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    });
  });

  it("keeps schedule empty before publication", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 7,
        lifecycleStatus: "draft",
        previous: {
          enabled: false,
          intervalDays: null,
          anchorAt: null,
          nextDueAt: null,
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: null,
    });
  });

  it("starts a full interval when automation is enabled on a published task", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 1,
        lifecycleStatus: "published",
        previous: {
          enabled: false,
          intervalDays: null,
          anchorAt: null,
          nextDueAt: null,
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: NOW,
      automationNextDueAt: "2026-08-20T03:20:00.000Z",
      automationPausedAt: null,
    });
  });

  it("starts a new full interval when interval changes", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 3,
        lifecycleStatus: "published",
        previous: {
          enabled: true,
          intervalDays: 7,
          anchorAt: "2026-08-10T03:20:00.000Z",
          nextDueAt: "2026-08-17T03:20:00.000Z",
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: NOW,
      automationNextDueAt: "2026-08-22T03:20:00.000Z",
      automationPausedAt: null,
    });
  });

  it("preserves a live schedule during ordinary editing", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 7,
        lifecycleStatus: "published",
        previous: {
          enabled: true,
          intervalDays: 7,
          anchorAt: "2026-08-10T03:20:00.000Z",
          nextDueAt: "2026-08-17T03:20:00.000Z",
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: "2026-08-10T03:20:00.000Z",
      automationNextDueAt: "2026-08-17T03:20:00.000Z",
      automationPausedAt: null,
    });
  });

  it("preserves an active pause during ordinary editing", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 7,
        lifecycleStatus: "published",
        previous: {
          enabled: true,
          intervalDays: 7,
          anchorAt: null,
          nextDueAt: null,
          pausedAt: "2026-08-18T03:20:00.000Z",
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
      automationPausedAt: "2026-08-18T03:20:00.000Z",
    });
  });

  it("repairs enabled published automation with a missing due date", () => {
    expect(
      resolveAutomationScheduleOnUpdate({
        enabled: true,
        intervalDays: 1,
        lifecycleStatus: "published",
        previous: {
          enabled: true,
          intervalDays: 1,
          anchorAt: null,
          nextDueAt: null,
          pausedAt: null,
        },
        now: NOW,
      }),
    ).toEqual({
      automationAnchorAt: NOW,
      automationNextDueAt: "2026-08-20T03:20:00.000Z",
      automationPausedAt: null,
    });
  });
});
