export type WorkspaceListSortMode = "newest" | "oldest" | "title_asc";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(
  record: Record<string, unknown> | null,
  keys: string[],
): string {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function inferTitle(value: unknown) {
  const record = asRecord(value);
  const content = asRecord(record?.content);

  return (
    firstString(record, ["title", "name", "headline", "subject"]) ||
    firstString(content, ["title", "name", "headline", "subject"])
  );
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string" || !value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferTimestamp(value: unknown) {
  const record = asRecord(value);
  const content = asRecord(record?.content);

  const direct =
    firstString(record, [
      "updatedAt",
      "updated_at",
      "publishedAt",
      "published_at",
      "createdAt",
      "created_at",
      "date",
      "meetingDate",
      "meeting_date",
    ]) ||
    firstString(content, [
      "updatedAt",
      "updated_at",
      "publishedAt",
      "published_at",
      "createdAt",
      "created_at",
      "date",
      "meetingDate",
      "meeting_date",
    ]);

  return parseTimestamp(direct);
}

function searchableText(value: unknown) {
  try {
    return JSON.stringify(value).toLocaleLowerCase("uk-UA");
  } catch {
    return "";
  }
}

export function filterAndSortWorkspaceItems<T>(
  items: readonly T[],
  query: string,
  sortMode: WorkspaceListSortMode,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("uk-UA");
  const filtered = normalizedQuery
    ? items.filter((item) => searchableText(item).includes(normalizedQuery))
    : [...items];

  return filtered.sort((left, right) => {
    if (sortMode === "title_asc") {
      return inferTitle(left).localeCompare(inferTitle(right), "uk-UA");
    }

    const difference = inferTimestamp(left) - inferTimestamp(right);
    return sortMode === "oldest" ? difference : -difference;
  });
}
