import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = "osbb-platform.com.ua";

function getHostname(hostHeader: string | null) {
  return (hostHeader ?? "").split(":")[0].toLowerCase();
}

function withSearch(pathname: string, search: string) {
  return `${pathname}${search || ""}`;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = getHostname(request.headers.get("host"));

  // localhost / preview domains → ничего не трогаем
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".vercel.app") ||
    hostname === "vercel.app"
  ) {
    return NextResponse.next();
  }

  // root-домен и www остаются публичным сайтом компании
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return NextResponse.next();
  }

  // admin.osbb-platform.com.ua/* -> /admin/*
  if (hostname === `admin.${ROOT_DOMAIN}`) {
    const adminPath =
      url.pathname === "/" ? "/admin" : `/admin${url.pathname}`;
    return NextResponse.rewrite(
      new URL(withSearch(adminPath, url.search), request.url),
    );
  }

  // <slug>.osbb-platform.com.ua/* -> /house/<slug>/*
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = hostname.slice(0, -(`.${ROOT_DOMAIN}`).length);

    if (slug && slug !== "www" && slug !== "admin") {
      const housePath =
        url.pathname === "/"
          ? `/house/${slug}`
          : `/house/${slug}${url.pathname}`;

      return NextResponse.rewrite(
        new URL(withSearch(housePath, url.search), request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
