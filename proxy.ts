import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/src/integrations/supabase/server/middleware";

const ROOT_DOMAIN = "osbb-platform.com.ua";
const ADMIN_HOST = `admin.${ROOT_DOMAIN}`;
const WWW_HOST = `www.${ROOT_DOMAIN}`;

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "").split(":")[0].toLowerCase();
}

function withSearch(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

function buildUrl(hostname: string, pathname: string, search: string) {
  return new URL(`https://${hostname}${withSearch(pathname, search)}`);
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  await supabase.auth.getUser();

  const url = request.nextUrl;
  const hostname = getHostname(request.headers.get("host"));
  const pathname = url.pathname;

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "vercel.app" ||
    hostname.endsWith(".vercel.app")
  ) {
    return response;
  }

  if (hostname === WWW_HOST) {
    return NextResponse.redirect(
      buildUrl(ROOT_DOMAIN, pathname, url.search),
      308,
    );
  }

  if (hostname === ROOT_DOMAIN) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.redirect(
        buildUrl(ADMIN_HOST, pathname, url.search),
        307,
      );
    }

    return response;
  }

  if (hostname === ADMIN_HOST) {
    let adminPath = pathname;

    if (adminPath === "/") {
      adminPath = "/admin";
    } else if (!adminPath.startsWith("/admin")) {
      adminPath = `/admin${adminPath}`;
    }

    return NextResponse.rewrite(
      new URL(withSearch(adminPath, url.search), request.url),
      { headers: response.headers },
    );
  }

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`).length);

    if (slug && slug !== "www" && slug !== "admin") {
      let housePath = pathname;

      if (housePath === "/") {
        housePath = `/house/${slug}`;
      } else if (!housePath.startsWith(`/house/${slug}`)) {
        housePath = `/house/${slug}${housePath}`;
      }

      return NextResponse.rewrite(
        new URL(withSearch(housePath, url.search), request.url),
        { headers: response.headers },
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
