import { notFound } from "next/navigation";
import { PublicHouseDashboardAlert } from "@/src/modules/houses/components/PublicHouseDashboardAlert";
import { PublicHouseDashboardCard } from "@/src/modules/houses/components/PublicHouseDashboardCard";
import { PublicHouseDashboardStatusStrip } from "@/src/modules/houses/components/PublicHouseDashboardStatusStrip";
import { PublicHouseHeroCarousel } from "@/src/modules/houses/components/PublicHouseHeroCarousel";
import { getPublicHouseHomeDashboard } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { readHouseSessionToken } from "@/src/modules/houses/services/readHouseSessionToken";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicHouseHomePage({ params }: Props) {
  const { slug } = await params;
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const districtColor = house.district?.theme_color ?? "#16a34a";
  const sessionToken =
    (await readHouseSessionToken(slug)) ?? "";

  const dashboard = await getPublicHouseHomeDashboard({
    house,
    sessionToken,
  });

  const headline = dashboard.heroContent.headline;
  const subheadline = dashboard.heroContent.subheadline;

  return (
    <div className="grid gap-6 lg:gap-7">
      <PublicHouseHeroCarousel
        slug={slug}
        districtColor={districtColor}
        headline={headline}
        subheadline={subheadline}
        houseCoverImageUrl={house.cover_image_url ?? null}
      />

      <PublicHouseDashboardStatusStrip items={dashboard.statusStrip} />

      <PublicHouseDashboardAlert alert={dashboard.topAlert} />

      <section className="grid gap-4 md:hidden">
        {(Array.isArray(dashboard.widgets) ? dashboard.widgets : []).map((widget) => (
          <PublicHouseDashboardCard key={widget.kind} widget={widget} />
        ))}
      </section>

      <section className="hidden gap-5 md:grid md:grid-cols-2">
        {(Array.isArray(dashboard.widgets) ? dashboard.widgets : []).map((widget) => (
          <PublicHouseDashboardCard key={widget.kind} widget={widget} />
        ))}
      </section>
    </div>
  );
}
