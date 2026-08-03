import { CityLanding } from "@/src/modules/site/components/blocks/CityLanding";
import { getSiteCity } from "@/src/modules/site/data/siteContent";

export default function OdesaPage() {
  return <CityLanding city={getSiteCity("odesa")} />;
}
