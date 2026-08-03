import { CityLanding } from "@/src/modules/site/components/blocks/CityLanding";
import { getSiteCity } from "@/src/modules/site/data/siteContent";
import { getSiteCmsContent } from "@/src/modules/site/services/getSiteCmsContent";

export default async function KyivPage() {
  const { cities } = await getSiteCmsContent();
  const city =
    cities.find((item) => item.slug === "kyiv") ?? getSiteCity("kyiv");

  return <CityLanding city={city} />;
}
