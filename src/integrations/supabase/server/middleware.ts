import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function createSupabaseMiddlewareClient(request: NextRequest) {
  // `response` must be read through this container, not destructured, because
  // `setAll` below reassigns it lazily the first time Supabase actually
  // rotates a session cookie (which happens *inside* `supabase.auth.getUser()`,
  // i.e. after this function has already returned). A destructured
  // `{ response }` binding would keep pointing at the original, cookie-less
  // `NextResponse.next()` and silently drop the refreshed Set-Cookie header,
  // so the browser would keep sending an already-rotated (and therefore
  // rejected) token on its next request.
  const responseHolder = {
    current: NextResponse.next({
      request,
    }),
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabasePublishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        responseHolder.current = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          responseHolder.current.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          responseHolder.current.headers.set(name, value);
        });
      },
    },
  });

  return { supabase, response: responseHolder };
}
