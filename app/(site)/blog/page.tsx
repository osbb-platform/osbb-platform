import { BlogCard } from "@/src/modules/site/components/blocks/BlogCard";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { getSiteCmsContent } from "@/src/modules/site/services/getSiteCmsContent";

const categories = [
  "Усі",
  "Практика голови",
  "Закон і документи",
  "Гроші будинку",
  "Оновлення платформи",
] as const;

export default async function BlogPage() {
  const { posts } = await getSiteCmsContent();

  const featuredPost = posts.find((post) => post.featured) ?? posts[0];

  const regularPosts = featuredPost
    ? posts.filter((post) => post.slug !== featuredPost.slug)
    : posts;

  return (
    <main id="main">
      <PageHero
        breadcrumb="Блог"
        description="Пишемо про те, з чим щодня стикається голова: звітність, боржники, кворум, документи будинку."
        eyebrow="Блог"
        title="Практика ОСББ: документи, гроші, збори"
      />

      <Section tight tone="quiet">
        <div aria-label="Категорії матеріалів" className="osbb-blog-categories">
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
