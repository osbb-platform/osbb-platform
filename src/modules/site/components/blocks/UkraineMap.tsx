import type { SiteCityContent } from "@/src/modules/site/data/siteContent";

import { CityCards } from "./CityCards";

type UkraineMapProps = {
  cities: readonly SiteCityContent[];
};

function getCityStatusLabel(city: SiteCityContent) {
  return city.status === "live"
    ? `${city.housesCount} будинків у системі`
    : "Відкриваємо місто";
}

export function UkraineMap({ cities }: UkraineMapProps) {
  return (
    <div className="osbb-ukraine-map">
      <div
        aria-label="Карта присутності OSBB Platform в Україні"
        className="osbb-ukraine-map__canvas"
        role="img"
      >
        <svg
          aria-hidden="true"
          className="osbb-ukraine-map__shape"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 1000 650"
        >
          <path
            className="osbb-ukraine-map__country"
            d="
              M112 245
              L142 208
              L185 197
              L215 158
              L274 143
              L309 113
              L370 124
              L405 100
              L449 116
              L490 97
              L538 120
              L581 112
              L611 144
              L668 150
              L706 184
              L755 181
              L789 211
              L848 214
              L878 250
              L918 258
              L905 299
              L930 326
              L899 351
              L873 393
              L827 397
              L797 427
              L756 418
              L719 446
              L681 432
              L651 458
              L611 451
              L578 480
              L539 468
              L501 493
              L465 481
              L430 507
              L382 495
              L345 520
              L302 505
              L257 515
              L229 479
              L188 468
              L174 427
              L139 403
              L144 364
              L114 336
              L128 299
              Z

              M642 462
              C673 458 704 470 727 493
              C707 514 683 527 653 529
              C627 515 620 489 642 462
              Z
            "
          />
        </svg>

        <div className="osbb-ukraine-map__markers">
          {cities.map((city) => {
            const statusLabel = getCityStatusLabel(city);

            return (
              <div
                className={[
                  "osbb-ukraine-map__marker",
                  city.status === "live"
                    ? "osbb-ukraine-map__marker--live"
                    : "osbb-ukraine-map__marker--opening",
                ].join(" ")}
                key={city.slug}
                style={{
                  left: `${city.mapX}%`,
                  top: `${city.mapY}%`,
                }}
              >
                <button
                  aria-label={`${city.name}. ${statusLabel}`}
                  className="osbb-ukraine-map__marker-button"
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="osbb-ukraine-map__marker-dot"
                  >
                    {city.status === "live" ? city.housesCount : null}
                  </span>

                  <span className="osbb-ukraine-map__marker-name">
                    {city.name}
                  </span>
                </button>

                <div
                  aria-hidden="true"
                  className="osbb-ukraine-map__tooltip"
                >
                  <strong>{city.name}</strong>
                  <span>{statusLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="osbb-ukraine-map__mobile">
        <CityCards cities={cities} />
      </div>
    </div>
  );
}
