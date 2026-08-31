const ADMIN_DATE_LOCALE = "uk-UA";

function parseAdminDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAdminDate(
  value: unknown,
  fallback = "Не опубліковано",
) {
  const date = parseAdminDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatAdminDateTime(
  value: unknown,
  fallback = "Не опубліковано",
) {
  const date = parseAdminDate(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(ADMIN_DATE_LOCALE, {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
