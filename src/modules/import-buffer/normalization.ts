export interface NormalizeAccountNumberOptions {
  prefixes?: readonly string[];
  removableSymbols?: readonly string[];
}

export function normalizeLocalizedNumber(
  value: unknown,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, "")
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  if (!/^[+-]?(?:\d+|\d*\.\d+)$/u.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeAccountNumber(
  value: unknown,
  options: NormalizeAccountNumberOptions = {},
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  for (const prefix of options.prefixes ?? []) {
    const escaped = escapeRegExp(prefix.trim());
    normalized = normalized.replace(
      new RegExp(`^${escaped}\\s*`, "iu"),
      "",
    );
  }

  for (const symbol of options.removableSymbols ?? []) {
    normalized = normalized.split(symbol).join("");
  }

  normalized = normalized.replace(/\s+/gu, "");

  if (!normalized || !/^\d+$/u.test(normalized)) {
    return null;
  }

  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
