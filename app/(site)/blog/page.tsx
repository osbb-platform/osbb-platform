import Link from "next/link";

import {
  sitePageTitles,
  sitePosts,
} from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

export default function BlogPage() {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-6xl px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-semibold text-zinc-950">
        {sitePageTitles.blog}
      </h1>

      <div className="mt-8 grid gap-4">
        {sitePosts.map((post) => (
          <article key={post.slug} className="rounded-xl border border-zinc-200 p-5">
            <p className="text-sm text-zinc-500">{post.category}</p>
            <h2 className="mt-2 text-xl font-semibold">{post.title}</h2>
            <p className="mt-2 text-zinc-600">{post.excerpt}</p>
            <Link
              className="mt-4 inline-flex text-sm font-medium underline"
              href={ROUTES.site.blogPost(post.slug)}
            >
              Читати
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
