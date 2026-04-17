import { getPublishedPrimaryCompanyPage } from "@/src/modules/company/services/getPublishedPrimaryCompanyPage";
import { getPublishedCompanySections } from "@/src/modules/company/services/getPublishedCompanySections";
import { PublicCompanyPageRenderer } from "@/src/modules/company/components/PublicCompanyPageRenderer";

export default async function PublicHomePage() {
  const companyPage = await getPublishedPrimaryCompanyPage();

  if (!companyPage) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
          <div className="max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
            <div className="mb-4 inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
              Company Site
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Главная страница компании пока не настроена
            </h1>

            <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
              В CMS пока не найдена опубликованная основная страница компании.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const sections = await getPublishedCompanySections(companyPage.id);
  const heroSection = sections.find((section) => section.kind === "hero");

  const heroContent =
    heroSection && typeof heroSection.content === "object" && heroSection.content
      ? heroSection.content
      : {};

  return (
    <PublicCompanyPageRenderer
      companyPage={companyPage}
      heroContent={heroContent}
      mode="home"
    />
  );
}
