import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = "osbb-platform.com.ua";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // localhost / vercel preview → ничего не трогаем
  if (
    hostname.includes("localhost") ||
    hostname.includes("vercel.app")
  ) {
    return NextResponse.next();
  }

  // --- ADMIN SUBDOMAIN ---
  if (hostname.startsWith("admin.")) {
    const newPathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    const rewriteUrl = new URL(newPathname, request.url);

    return NextResponse.rewrite(rewriteUrl);
  }

  // --- HOUSE SUBDOMAIN ---
  if (hostname.endsWith(ROOT_DOMAIN)) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, "");

    // исключаем root домен
    if (subdomain && subdomain !== "www") {
      const newPathname = `/house/${subdomain}${url.pathname}`;
      const rewriteUrl = new URL(newPathname, request.url);

      return NextResponse.rewrite(rewriteUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Запускаем middleware только для реальных страниц
     */
    "/((?!_next|favicon.ico|api).*)",
  ],
};
