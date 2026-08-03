import Link from "next/link";

import type { SiteCityContent } from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type CityCardsProps = {
  cities: readonly SiteCityContent[];
};

const cityRoutes = {
  kyiv: ROUTES.site.kyiv,
  odesa: ROUTES.site.odesa,
  zaporizhzhia: ROUTES.site.home,
} as const;

export function CityCards({ cities }: CityCardsProps) {
  return (
    <div className="osbb-city-cards">
      {cities.map((city) => (
        <Link
          className="osbb-city-card"
          href={cityRoutes[city.slug]}
          key={city.slug}
        >
          <div>
            <h3>{city.name}</h3>
            <p>
              {city.status === "live"
                ? `${city.housesCount} будинків`
                : "Відкриття восени 2026"}
            </p>
          </div>

          <span
            className={
              city.status === "live"
                ? "osbb-badge osbb-badge--ok"
                : "osbb-badge osbb-badge--soon"
            }
          >
            {city.status === "live" ? "Працює" : "Восени 2026"}
          </span>
        </Link>
      ))}
    </div>
  );
}
