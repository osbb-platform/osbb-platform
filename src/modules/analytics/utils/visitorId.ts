import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const HOUSE_VISITOR_COOKIE_NAME = "osbb_vid";
const HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function getOrCreateVisitorId() {
  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(HOUSE_VISITOR_COOKIE_NAME)?.value;

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = randomUUID();

  cookieStore.set(HOUSE_VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS,
  });

  return visitorId;
}
