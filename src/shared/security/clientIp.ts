type HeaderReader = {
  get(name: string): string | null;
};

const CLIENT_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
] as const;

function normalizeHeaderIp(value: string): string | null {
  const firstValue = value.split(",")[0]?.trim().toLowerCase() ?? "";

  if (!firstValue || firstValue.length > 128) {
    return null;
  }

  return firstValue;
}

/**
 * Trust boundary:
 * production must run behind the configured reverse proxy, which owns
 * the forwarded-IP headers. Application callers must not supply a
 * form/query value as the client IP.
 */
export function getClientIpAddress(headers: HeaderReader): string {
  for (const headerName of CLIENT_IP_HEADERS) {
    const rawValue = headers.get(headerName);

    if (!rawValue) {
      continue;
    }

    const normalized = normalizeHeaderIp(rawValue);

    if (normalized) {
      return normalized;
    }
  }

  return "unknown";
}
