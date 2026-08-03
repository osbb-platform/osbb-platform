import { BlogCard } from "@/src/modules/site/components/blocks/BlogCard";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { sitePosts } from "@/src/modules/site/data/siteContent";

const categories = [
  "Усі",
  "Практика голови",
  "Закон і документи",
  "Гроші будинку",
  "Оновлення платформи",
] as const;

export default function BlogPage() {
  const featuredPost =
    sitePosts.find((post) => post.featured) ?? sitePosts[0];

  const regularPosts = featuredPost
    ? sitePosts.filter((post) => post.slug !== featuredPost.slug)
    : sitePosts;

  return (
    <main id="main">
      <PageHero
        breadcrumb="Блог"
        description="Пишемо про те, з чим щодня стикається голова: звітність, боржники, кворум, документи будинку."
        eyebrow="Блог"
        title="Практика ОСББ: документи, гроші, збори"
      />

      <Section tight tone="quiet">
        <div
          aria-label="Категорії матеріалів"
          className="osbb-blog-categories"
        >
          {categories.map((category, index) => (
            <span
              className={index === 0 ? "is-active" : undefined}
              key={category}
            >
              {category}
            </span>
          ))}
        </div>
      </Section>

      {featuredPost ? (
        <Section>
          <div className="osbb-head">
            <Eyebrow>Матеріали</Eyebrow>
            <h2>Головний матеріал</h2>
          </div>

          <BlogCard featured post={featuredPost} />
        </Section>
      ) : null}

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Матеріали</Eyebrow>
          <h2>Останні статті</h2>
        </div>

        <div className="osbb-blog-grid">
          {regularPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </Section>
    </main>
  );
}
