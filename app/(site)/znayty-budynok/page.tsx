import type { Metadata } from "next";

import { HouseSearch } from "@/src/modules/site/components/blocks/HouseSearch";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { siteCities } from "@/src/modules/site/data/siteContent";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function FindHousePage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Знайти будинок"
        description="Введіть адресу або назву ОСББ. Якщо будинок підключений, ми покажемо адресу його особистого кабінету."
        eyebrow="Пошук"
        note="Для входу до знайденого кабінету знадобиться 6-значний код від правління вашого будинку."
        title="Знайдіть кабінет свого будинку"
      />

      <Section tone="quiet">
        <HouseSearch />
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Міста</Eyebrow>
          <h2>Де вже працює або відкривається сервіс</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          {siteCities.map((city) => (
            <Card key={city.slug}>
              <h3>{city.name}</h3>
              <p>
                {city.status === "live"
                  ? `${city.housesCount} будинків уже в системі.`
                  : "Збираємо заявки на підключення в цьому місті."}
              </p>

              <span
                className={
                  city.status === "live"
                    ? "osbb-badge osbb-badge--ok"
                    : "osbb-badge osbb-badge--soon"
                }
              >
                {city.status === "live" ? "Працює" : "Відкриваємо місто"}
              </span>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Не знайшли?</Eyebrow>
          <h2>Можливо, ваш будинок ще не підключений</h2>

          <p className="osbb-lead osbb-lead--deep">
            Передайте голові або правлінню посилання на OSBB Platform.
            Після підключення будинок отримає окрему адресу і власний код
            доступу.
          </p>
        </div>
      </Section>
    </main>
  );
}
