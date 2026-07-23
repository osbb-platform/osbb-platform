export const PLAN_AUTOMATION_MIN_INTERVAL_DAYS = 1;
export const PLAN_AUTOMATION_MAX_INTERVAL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeAutomationEnabled(value: unknown) {
  return value === true;
}

export function normalizeAutomationIntervalDays(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < PLAN_AUTOMATION_MIN_INTERVAL_DAYS || value > PLAN_AUTOMATION_MAX_INTERVAL_DAYS) return null;
  return value;
}

export function validateAutomationConfiguration(input: { enabled: boolean; intervalDays: number | null }) {
  return !input.enabled || input.intervalDays !== null;
}

export function addUtcCalendarDays(isoTimestamp: string, intervalDays: number) {
  const timestamp = Date.parse(isoTimestamp);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid automation anchor timestamp.");
  return new Date(timestamp + intervalDays * DAY_MS).toISOString();
}

export function createAutomationSchedule(input: { enabled: boolean; intervalDays: number | null; anchorAt: string }) {
  if (!input.enabled || input.intervalDays === null) {
    return { automationAnchorAt: null, automationNextDueAt: null };
  }
  return {
    automationAnchorAt: input.anchorAt,
    automationNextDueAt: addUtcCalendarDays(input.anchorAt, input.intervalDays),
  };
}
