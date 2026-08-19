import { headers } from "next/headers";

export function getClientIpFromHeaders(
  headerStore: Pick<Headers, "get">,
): string {
  const forwarded = headerStore.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);

    if (first) {
      return first;
    }
  }

  const realIp = headerStore.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function getClientIp(): Promise<string> {
  return getClientIpFromHeaders(await headers());
}
