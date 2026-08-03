import { notFound } from "next/navigation";

import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  getSitePost,
  sitePosts,
} from "@/src/modules/site/data/siteContent";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return sitePosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getSitePost(slug);

  if (!post) {
    notFound();
  }

  return (
    <SiteRoutePlaceholder
      title={post.title}
      description={post.excerpt}
    />
  );
}
