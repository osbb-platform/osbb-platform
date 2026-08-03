import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import { getSiteCity } from "@/src/modules/site/data/siteContent";

export default function KyivPage() {
  const city = getSiteCity("kyiv");

  return (
    <SiteRoutePlaceholder
      title={`OSBB Platform ${city.nameLocative}`}
      description={`Статус міста: ${city.status}. Дані сторінки читаються з єдиного реєстру siteCities.`}
    />
  );
}
