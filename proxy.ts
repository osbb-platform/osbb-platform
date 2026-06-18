import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./src/integrations/supabase/server/middleware";

const ROOT_DOMAIN = "osbb-platform.com.ua";
const ADMIN_HOST = `admin.${ROOT_DOMAIN}`;
const WWW_HOST = `www.${ROOT_DOMAIN}`;

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "").split(":")[0].toLowerCase();
}

function withSearch(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = getHostname(request.headers.get("host"));
  const pathname = url.pathname;

  // API-запросы не должны создавать Supabase middleware client
  // и не должны обновлять auth-сессию через auth.getUser().
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // локалка и vercel preview не трогаем
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "vercel.app" ||
    hostname.endsWith(".vercel.app")
  ) {
    return NextResponse.next();
  }

  // 👉 www → apex
  if (hostname === WWW_HOST) {
    return NextResponse.redirect(
      new URL(`https://${ROOT_DOMAIN}${withSearch(pathname, url.search)}`),
      308
    );
  }

  // 👉 ADMIN
  // Supabase auth refresh нужен только admin-хосту.
  if (hostname === ADMIN_HOST) {
    const { supabase, response } = createSupabaseMiddlewareClient(request);

    // Важно для Supabase SSR: обновляет auth cookies только в админке.
    // Публичные поддомены и root-домен не должны делать round-trip к Auth.
    await supabase.auth.getUser();

    let adminPath = pathname;

    if (adminPath === "/") {
      adminPath = "/admin";
    } else if (!adminPath.startsWith("/admin")) {
      adminPath = `/admin${adminPath}`;
    }

    return NextResponse.rewrite(
      new URL(withSearch(adminPath, url.search), request.url),
      { headers: response.headers }
    );
  }

  // 👉 ROOT DOMAIN
  if (hostname === ROOT_DOMAIN) {
    if (pathname.startsWith("/admin")) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (pathname.startsWith("/house/")) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.next();
  }

  // 👉 HOUSE SUBDOMAINS
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.replace(`.${ROOT_DOMAIN}`, "");

    if (slug && slug !== "www" && slug !== "admin") {
      let housePath = pathname;

      if (housePath === "/") {
        housePath = `/house/${slug}`;
      } else if (!housePath.startsWith(`/house/${slug}`)) {
        housePath = `/house/${slug}${housePath}`;
      }

      return NextResponse.rewrite(
        new URL(withSearch(housePath, url.search), request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf)$).*)",
  ],
};
