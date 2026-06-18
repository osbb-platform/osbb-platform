/** Корневой домен платформы, напр. "osbb-platform.com.ua". */
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "osbb-platform.com.ua";

/** Поддомены, которые НЕ являются slug дома. */
export const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api"]);

/** Абсолютный origin админки: https://admin.osbb-platform.com.ua */
export function adminOrigin(): string {
  return `https://admin.${ROOT_DOMAIN}`;
}

/** Абсолютный origin кабинета дома: https://{slug}.osbb-platform.com.ua */
export function houseOrigin(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`;
}

/** Абсолютная ссылка на раздел кабинета дома для кросс-поддоменных переходов. */
export function houseUrl(slug: string, path = "/"): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${houseOrigin(slug)}${clean}`;
}
