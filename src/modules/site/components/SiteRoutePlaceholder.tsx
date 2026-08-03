import Link from "next/link";

import { ROUTES } from "@/src/shared/config/routes/routes.config";

type SiteRoutePlaceholderProps = {
  title: string;
  description?: string;
};

export function SiteRoutePlaceholder({
  title,
  description = "Сторінка буде перенесена з затвердженого HTML-прототипу в наступних задачах блоку A.",
}: SiteRoutePlaceholderProps) {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">
        OSBB Platform
      </p>

      <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-zinc-950 sm:text-5xl">
        {title}
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
        {description}
      </p>

      <Link
        href={ROUTES.site.home}
        className="mt-10 inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
      >
        На головну
      </Link>
    </main>
  );
}
