import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  addUtcCalendarDays,
  createAutomationSchedule,
  normalizeAutomationIntervalDays,
  validateAutomationConfiguration,
} from "../../src/modules/content-engine/v2/handlers/plan/automation";

const createCommand = readFileSync(
  "src/modules/content-engine/v2/handlers/plan/commands/create.ts",
  "utf8",
);
const updateCommand = readFileSync(
  "src/modules/content-engine/v2/handlers/plan/commands/update.ts",
  "utf8",
);
const publishCommand = readFileSync(
  "src/modules/content-engine/v2/handlers/plan/commands/publish.ts",
  "utf8",
);
const adminRead = readFileSync(
  "src/modules/houses/services/getAdminHousePlan.ts",
  "utf8",
);
const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);

describe("P05 T5.1 plan automation configuration", () => {
  it("accepts only integer intervals from 1 to 365", () => {
    expect(normalizeAutomationIntervalDays(1)).toBe(1);
    expect(normalizeAutomationIntervalDays(365)).toBe(365);
    expect(normalizeAutomationIntervalDays(0)).toBeNull();
    expect(normalizeAutomationIntervalDays(366)).toBeNull();
    expect(normalizeAutomationIntervalDays(1.5)).toBeNull();
    expect(normalizeAutomationIntervalDays("7")).toBeNull();
  });

  it("requires an interval only when automation is enabled", () => {
    expect(validateAutomationConfiguration({
      enabled: false,
      intervalDays: null,
    })).toBe(true);

    expect(validateAutomationConfiguration({
      enabled: true,
      intervalDays: null,
    })).toBe(false);

    expect(validateAutomationConfiguration({
      enabled: true,
      intervalDays: 7,
    })).toBe(true);
  });

  it("calculates a full UTC interval from the anchor", () => {
    expect(addUtcCalendarDays("2026-07-23T12:00:00.000Z", 7)).toBe(
      "2026-07-30T12:00:00.000Z",
    );
  });

  it("creates no schedule for disabled automation", () => {
    expect(createAutomationSchedule({
      enabled: false,
      intervalDays: null,
      anchorAt: "2026-07-23T12:00:00.000Z",
    })).toEqual({
      automationAnchorAt: null,
      automationNextDueAt: null,
    });
  });

  it("persists configuration in create and update", () => {
    for (const command of [createCommand, updateCommand]) {
      expect(command).toContain("readAutomationConfiguration(payload)");
      expect(command).toContain("automation_enabled: automation.enabled");
      expect(command).toContain(
        "automation_interval_days: automation.intervalDays",
      );
      expect(command).toContain("automation_paused_at: null");
      expect(command).toContain("automation_anchor_at: null");
      expect(command).toContain("automation_next_due_at: null");
    }
  });

  it("anchors the first full interval on publish", () => {
    expect(publishCommand).toContain("createAutomationSchedule({");
    expect(publishCommand).toContain("anchorAt: now");
    expect(publishCommand).toContain(
      "automation_anchor_at: automationSchedule.automationAnchorAt",
    );
    expect(publishCommand).toContain(
      "automation_next_due_at: automationSchedule.automationNextDueAt",
    );
  });

  it("exposes automation through admin state", () => {
    expect(adminRead).toContain(
      "automationEnabled: task.automation_enabled",
    );
    expect(adminRead).toContain(
      "automationIntervalDays: task.automation_interval_days",
    );
    expect(workspace).toContain("automationEnabled: boolean");
    expect(workspace).toContain("automationIntervalDays: number | null");
    expect(workspace).toContain(
      "automationEnabled: task.automationEnabled",
    );
  });
});
