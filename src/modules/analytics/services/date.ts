import type { AnalyticsFilter } from "@/src/modules/analytics/services/types";

export function getSafeAnalyticsFilter(filter: AnalyticsFilter) {
  const from = new Date(filter.from);
  const to = new Date(filter.to);

  const safeTo = Number.isNaN(to.getTime()) ? new Date() : to;
  const safeFrom = Number.isNaN(from.getTime())
    ? new Date(safeTo.getTime() - 30 * 24 * 60 * 60 * 1000)
    : from;

  safeFrom.setHours(0, 0, 0, 0);
  safeTo.setHours(23, 59, 59, 999);

  return {
    houseId: filter.houseId?.trim() || undefined,
    from: safeFrom.toISOString(),
    to: safeTo.toISOString(),
  };
}

export function getDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function getHourKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getHours();
}
