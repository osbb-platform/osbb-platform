import Link from "next/link";

import type { SitePostContent } from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type BlogCardProps = {
  post: SitePostContent;
  featured?: boolean;
};

export function BlogCard({
  post,
  featured = false,
}: BlogCardProps) {
  return (
    <article
      className={[
        "osbb-blog-card",
        featured && "osbb-blog-card--featured",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <p className="osbb-blog-card__category">{post.category}</p>

        <h2>
          <Link href={ROUTES.site.blogPost(post.slug)}>
            {post.title}
          </Link>
        </h2>

        <p className="osbb-blog-card__excerpt">{post.excerpt}</p>
      </div>

      <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
    </article>
  );
}
