import { notFound } from "next/navigation";
import { getPublishedCompanyPageBySlug } from "@/src/modules/company/services/getPublishedCompanyPageBySlug";
import { getPublishedCompanySections } from "@/src/modules/company/services/getPublishedCompanySections";
import { PublicCompanyPageRenderer } from "@/src/modules/company/components/PublicCompanyPageRenderer";

type PublicCompanySlugPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicCompanySlugPage({
  params,
}: PublicCompanySlugPageProps) {
  const { slug } = await params;

  const companyPage = await getPublishedCompanyPageBySlug(slug);

  if (!companyPage) {
    notFound();
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
      mode="slug"
    />
  );
}
