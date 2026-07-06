/**
 * Shared policy for Supabase authentication cookies.
 *
 * Supabase authentication state must remain readable by its browser client,
 * therefore these cookies cannot be HttpOnly.
 *
 * Domain is intentionally omitted. Authentication remains host-only on the
 * admin subdomain and is not shared with public house subdomains.
 */
export function getSupabaseAuthCookieOptions() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
