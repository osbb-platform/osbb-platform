import "server-only";

import { cookies } from "next/headers";

import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

export async function readHouseSessionToken(
  slug: string,
): Promise<string | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const cookieStore = await cookies();
  const value =
    cookieStore.get(
      getHouseAccessCookieName(normalizedSlug),
    )?.value ?? "";

  return value.trim() || null;
}
