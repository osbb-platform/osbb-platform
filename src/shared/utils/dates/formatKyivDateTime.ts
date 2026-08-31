const KYIV_TIME_ZONE = "Europe/Kyiv";

const KYIV_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatKyivDateTime(
  value: string | number | Date | null | undefined,
  fallback = "—",
) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return KYIV_DATE_TIME_FORMATTER.format(date);
}
