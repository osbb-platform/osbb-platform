import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  RESERVED_SUBDOMAINS,
  ROOT_DOMAIN,
} from "./src/shared/config/app/domains";
import { createSupabaseMiddlewareClient } from "./src/integrations/supabase/server/middleware";

const WWW_HOST = `www.${ROOT_DOMAIN}`;

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "").split(":")[0].toLowerCase();
}

function withSearch(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

/** Возвращает поддомен ("admin" | "{slug}") или null для корневого домена. */
function resolveSubdomain(hostname: string): string | null {
  // DEV: localhost = root, admin.localhost / slug.localhost = subdomains
  if (hostname === "localhost") return null;
  if (hostname.endsWith(".localhost")) {
    return hostname.slice(0, -".localhost".length);
  }

  if (hostname === ROOT_DOMAIN || hostname === WWW_HOST) {
    return null;
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return hostname.slice(0, -`.${ROOT_DOMAIN}`.length);
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = getHostname(request.headers.get("host"));
  const pathname = url.pathname;
  const subdomain = resolveSubdomain(hostname);

  // API-запросы не должны создавать Supabase middleware client,
  // не должны обновлять auth-сессию через auth.getUser()
  // и не должны переписываться ни на одном host.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Vercel preview не трогаем.
  if (hostname === "vercel.app" || hostname.endsWith(".vercel.app")) {
    return NextResponse.next();
  }

  // www → apex только на prod-домене.
  if (hostname === WWW_HOST) {
    return NextResponse.redirect(
      new URL(`https://${ROOT_DOMAIN}${withSearch(pathname, url.search)}`),
      308
    );
  }

  // Root / localhost / unknown host — pass-through без Supabase/auth.
  if (!subdomain) {
    // На apex старые внутренние публичные/admin пути не должны светиться.
    if (hostname === ROOT_DOMAIN) {
      if (pathname.startsWith("/admin")) {
        return new NextResponse("Not Found", { status: 404 });
      }

      if (pathname.startsWith("/house/")) {
        return new NextResponse("Not Found", { status: 404 });
      }
    }

    return NextResponse.next();
  }

  // ADMIN subdomain:
  // browser: admin.root/houses
  // internal: /admin/houses
  //
  // Supabase auth refresh нужен только admin-поддомену.
  // Public/root/runtime не должны делать round-trip к Auth.
  if (subdomain === "admin") {
    const { supabase, response } = createSupabaseMiddlewareClient(request);

    await supabase.auth.getUser();

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      url.pathname = pathname.slice("/admin".length) || "/";
      return NextResponse.redirect(url, 308);
    }

    const adminPath = pathname === "/" ? "/admin" : `/admin${pathname}`;

    return NextResponse.rewrite(
      new URL(withSearch(adminPath, url.search), request.url),
      { headers: response.headers }
    );
  }

  // HOUSE subdomains:
  // browser: slug.root/announcements
  // internal: /house/slug/announcements
  //
  // Public house subdomains не создают Supabase middleware client.
  if (!RESERVED_SUBDOMAINS.has(subdomain)) {
    const duplicatePrefix = `/house/${subdomain}`;

    if (pathname === duplicatePrefix || pathname.startsWith(`${duplicatePrefix}/`)) {
      url.pathname = pathname.slice(duplicatePrefix.length) || "/";
      return NextResponse.redirect(url, 308);
    }

    const housePath =
      pathname === "/" ? `/house/${subdomain}` : `/house/${subdomain}${pathname}`;

    return NextResponse.rewrite(
      new URL(withSearch(housePath, url.search), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf)$).*)",
  ],
};
