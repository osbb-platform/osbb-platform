import { notFound } from "next/navigation";
import { PublicHouseDashboardAlert } from "@/src/modules/houses/components/PublicHouseDashboardAlert";
import { PublicHouseDashboardCard } from "@/src/modules/houses/components/PublicHouseDashboardCard";
import { PublicHouseDashboardStatusStrip } from "@/src/modules/houses/components/PublicHouseDashboardStatusStrip";
import { PublicHouseHeroCarousel } from "@/src/modules/houses/components/PublicHouseHeroCarousel";
import { getPublicHouseHomeDashboard } from "@/src/modules/houses/services/getPublicHouseHomeDashboard";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";

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

  const dashboard = await getPublicHouseHomeDashboard({
    houseId: house.id,
    slug,
  });

  const headline = dashboard.heroContent.headline;
  const subheadline = dashboard.heroContent.subheadline;

  return (
    <div className="grid gap-6 lg:gap-8">
      <PublicHouseHeroCarousel
        slug={slug}
        districtColor={districtColor}
        headline={headline}
        subheadline={subheadline}
      />

      <PublicHouseDashboardStatusStrip items={dashboard.statusStrip} />

      <PublicHouseDashboardAlert alert={dashboard.topAlert} />

      <section className="md:hidden">
        <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <div className="flex snap-x snap-mandatory gap-4 pb-2">
            {dashboard.widgets.map((widget) => (
              <div
                key={widget.kind}
                className="min-w-[88%] snap-start sm:min-w-[72%]"
              >
                <PublicHouseDashboardCard widget={widget} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden gap-4 md:grid md:grid-cols-2 lg:gap-6">
        {dashboard.widgets.map((widget) => (
          <PublicHouseDashboardCard
            key={widget.kind}
            widget={widget}
          />
        ))}
      </section>
    </div>
  );
}
