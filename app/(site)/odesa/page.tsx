import { CityLanding } from "@/src/modules/site/components/blocks/CityLanding";
import { getSiteCity } from "@/src/modules/site/data/siteContent";
import { getSiteCmsContent } from "@/src/modules/site/services/getSiteCmsContent";

export default async function OdesaPage() {
  const { cities } = await getSiteCmsContent();
  const city =
    cities.find((item) => item.slug === "odesa") ?? getSiteCity("odesa");

  return <CityLanding city={city} />;
}
