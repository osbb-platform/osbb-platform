export function getHouseSlug(pathname: string): string | null {
  const match = pathname.match(/^\/house\/([^/]+)/);
  return match?.[1] ?? null;
}
