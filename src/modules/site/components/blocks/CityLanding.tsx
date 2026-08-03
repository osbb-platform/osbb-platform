import Link from "next/link";

import type { SiteCityContent } from "@/src/modules/site/data/siteContent";

import { CtaBlock } from "./CtaBlock";
import { PageHero } from "./PageHero";
import { Card } from "../ui/Card";
import { Eyebrow } from "../ui/Eyebrow";
import { Section } from "../ui/Section";

type CityLandingProps = {
  city: SiteCityContent;
};

export function CityLanding({ city }: CityLandingProps) {
  return (
    <main id="main">
      <PageHero
        breadcrumb={city.name}
        description={`OSBB Platform ${city.nameLocative}: особистий кабінет будинку, який наповнює і веде наша команда.`}
        eyebrow="Нове місто"
        note="Збираємо перші будинки та формуємо команду представників у місті."
        title={`Відкриваємо OSBB Platform ${city.nameLocative}`}
      />

      <Section tone="quiet">
        <div className="osbb-city-intro">
          <div>
            <Eyebrow>Статус</Eyebrow>
            <h2>Початок роботи — восени 2026 року</h2>

            <p className="osbb-lead">
              Зараз ми збираємо заявки від голів ОСББ, управляючих компаній
              і фахівців, які хочуть представляти сервіс у місті.
            </p>
          </div>

          <div className="osbb-city-status-panel">
            <span className="osbb-badge osbb-badge--soon">
              Восени 2026
            </span>

            <p>
              Перші будинки отримають кабінети після завершення локального
              запуску і підготовки представника міста.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Що отримає будинок</Eyebrow>
          <h2>Готовий кабінет і команда, яка веде його за вас</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <h3>Особистий кабінет будинку</h3>
            <p>
              Оголошення, звіти, збори, план робіт, борги, контакти і
              документи.
            </p>
          </Card>

          <Card>
            <h3>Локальний представник</h3>
            <p>
              Людина у вашому місті, яка приїжджає на об’єкт і допомагає
              зібрати матеріали.
            </p>
          </Card>

          <Card>
            <h3>Постійне ведення</h3>
            <p>
              Наш менеджер наповнює і регулярно оновлює кабінет після
              запуску.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Для перших будинків</Eyebrow>
          <h2>Залиште заявку на раннє підключення</h2>

          <p className="osbb-lead osbb-lead--deep">
            Ми зв’яжемося, розповімо про запуск у місті і внесемо ваш
            будинок до списку перших підключень.
          </p>

          <Link
            className="osbb-btn osbb-btn--primary osbb-city-cta-link"
            href="#zayavka"
          >
            Залишити заявку
          </Link>
        </div>
      </Section>

      <CtaBlock
        description={`Залиште контакти — повідомимо про запуск OSBB Platform ${city.nameLocative} і покажемо, як виглядатиме кабінет вашого будинку.`}
        eyebrow={city.name}
        title="Стати одним із перших будинків"
      />
    </main>
  );
}
