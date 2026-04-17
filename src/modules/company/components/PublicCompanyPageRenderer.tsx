import Link from "next/link";
import { getPublishedCompanyNavigation } from "@/src/modules/company/services/getPublishedCompanyNavigation";

type PublicCompanyPageRendererProps = {
  companyPage: {
    title: string;
    slug: string;
    status: string;
    seo_description: string | null;
  };
  heroContent: Record<string, unknown>;
  mode: "home" | "slug";
};

export async function PublicCompanyPageRenderer({
  companyPage,
  mode,
}: PublicCompanyPageRendererProps) {
  const navigation = await getPublishedCompanyNavigation();
  const currentPath = mode === "home" ? "/" : `/${companyPage.slug}`;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-white/80">
        <div className="mx-auto flex max-w-6xl gap-3 px-6 py-4">
          {navigation.header.map((item) => {
            const href = item.is_primary ? "/" : `/${item.slug}`;
            return (
              <Link key={item.id} href={href}>
                {item.title}
              </Link>
            );
          })}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-5xl font-semibold">{companyPage.title}</h1>
      </section>

      <footer className="border-t border-[var(--border)] bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 py-6">
          {navigation.footer.map((item) => {
            const href = item.is_primary ? "/" : `/${item.slug}`;
            const isActive = href === currentPath;

            return (
              <Link
                key={item.id}
                href={href}
                className={isActive ? "font-semibold" : ""}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      </footer>
    </main>
  );
}
