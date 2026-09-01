const HOUSE_SEARCH_SEPARATOR_PATTERN =
  /[\s\u00a0№.,\-–—_:;'"«»()[\]{}\/\\]+/gu;

export function normalizeHouseSearchText(
  value: unknown,
): string {
  if (typeof value !== "string") return "";

  return value
    // NFKC expands U+2116 NUMERO SIGN to "No".
    // Remove it first so "№5" normalizes to "5", not "no5".
    .replace(/№/gu, " ")
    .normalize("NFKC")
    .toLocaleLowerCase("uk-UA")
    .replace(/і/gu, "и")
    .replace(HOUSE_SEARCH_SEPARATOR_PATTERN, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function houseSearchTextMatches(
  values: readonly unknown[],
  query: unknown,
): boolean {
  const normalizedQuery = normalizeHouseSearchText(query);

  if (!normalizedQuery) return true;

  const haystack = normalizeHouseSearchText(
    values
      .filter(
        (value): value is string =>
          typeof value === "string",
      )
      .join(" "),
  );

  return haystack.includes(normalizedQuery);
}
