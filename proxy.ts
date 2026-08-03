import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  RESERVED_SUBDOMAINS,
  ROOT_DOMAIN,
} from "./src/shared/config/app/domains";
import { createSupabaseMiddlewareClient } from "./src/integrations/supabase/server/middleware";

const WWW_HOST = `www.${ROOT_DOMAIN}`;

const SITE_ATTRIBUTION_COOKIE_NAME = "osbb_attr";
const SITE_ATTRIBUTION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

type SiteAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing_page: string;
  referrer: string | null;
  first_seen_at: string;
};

function cleanAttributionValue(value: string | null, maxLength: number) {
  const normalized = value?.trim().slice(0, maxLength) ?? "";
  return normalized || null;
}

function withFirstTouchAttribution(
  request: NextRequest,
  response: NextResponse,
) {
  if (request.cookies.has(SITE_ATTRIBUTION_COOKIE_NAME)) {
    return response;
  }

  const searchParams = request.nextUrl.searchParams;

  const attribution: SiteAttribution = {
    utm_source: cleanAttributionValue(
      searchParams.get("utm_source"),
      200,
    ),
    utm_medium: cleanAttributionValue(
      searchParams.get("utm_medium"),
      200,
    ),
    utm_campaign: cleanAttributionValue(
      searchParams.get("utm_campaign"),
      200,
    ),
    utm_content: cleanAttributionValue(
      searchParams.get("utm_content"),
      200,
    ),
    landing_page: `${request.nextUrl.pathname}${request.nextUrl.search}`.slice(
      0,
      1000,
    ),
    referrer: cleanAttributionValue(
      request.headers.get("referer"),
      1000,
    ),
    first_seen_at: new Date().toISOString(),
  };

  response.cookies.set(
    SITE_ATTRIBUTION_COOKIE_NAME,
    JSON.stringify(attribution),
    {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SITE_ATTRIBUTION_MAX_AGE_SECONDS,
    },
  );

  return response;
}

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


const LEGACY_HOUSE_SLUG_REDIRECTS: Record<string, string> = {
  "osbb-chapivna-163": "osbb-charivna-163",
};

function buildLegacyHouseRedirectHostname(currentHostname: string, targetSlug: string) {
  if (currentHostname.endsWith(".localhost")) {
    return `${targetSlug}.localhost`;
  }

  if (currentHostname === ROOT_DOMAIN || currentHostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return `${targetSlug}.${ROOT_DOMAIN}`;
  }

  return `${targetSlug}.${ROOT_DOMAIN}`;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = getHostname(request.headers.get("host"));
  const pathname = url.pathname;
  const subdomain = resolveSubdomain(hostname);

  const legacyHouseSlugTarget = subdomain
    ? LEGACY_HOUSE_SLUG_REDIRECTS[subdomain]
    : undefined;

  if (legacyHouseSlugTarget) {
    const url = request.nextUrl.clone();
    url.hostname = buildLegacyHouseRedirectHostname(hostname, legacyHouseSlugTarget);

    return NextResponse.redirect(url, 307);
  }


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

    return withFirstTouchAttribution(
      request,
      NextResponse.next(),
    );
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
