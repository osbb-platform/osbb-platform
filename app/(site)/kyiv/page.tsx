import { CityLanding } from "@/src/modules/site/components/blocks/CityLanding";
import { getSiteCity } from "@/src/modules/site/data/siteContent";

export default function KyivPage() {
  return <CityLanding city={getSiteCity("kyiv")} />;
}
