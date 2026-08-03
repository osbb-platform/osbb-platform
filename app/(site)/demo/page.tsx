import Link from "next/link";

import { CabinetMockup } from "@/src/modules/site/components/blocks/CabinetMockup";
import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { CodeCells } from "@/src/modules/site/components/ui/CodeCells";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { siteSettings } from "@/src/modules/site/data/siteContent";
import { getCabinetMockup } from "@/src/modules/site/data/mockupData";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

const demoSections = [
  "Оголошення",
  "Інформація",
  "Звіти",
  "План робіт",
  "Збори",
  "Нарахування та боржники",
  "Правління",
  "Спеціалісти",
  "Реквізити",
  "Установчі документи",
  "Опитування",
] as const;

export default function DemoPage() {
  const mockup = getCabinetMockup("home");

  if (!mockup) {
    throw new Error("Demo cabinet mockup is missing");
  }

  return (
    <main id="main">
      <PageHero
        actions={
          <>
            <a
              className="osbb-btn osbb-btn--primary"
              href={siteSettings.demoHouseUrl}
              rel="noreferrer"
              target="_blank"
            >
              Відкрити демо-кабінет
            </a>

            <Link
              className="osbb-btn osbb-btn--secondary"
              href={ROUTES.site.capabilities}
            >
              Усі можливості
            </Link>
          </>
        }
        aside={<CabinetMockup data={mockup} />}
        breadcrumb="Демо-кабінет"
        description="Відкрийте готовий кабінет показового будинку і подивіться на сервіс очима мешканця."
        eyebrow="Демо"
        note="Усі назви, квартири, суми, контакти та документи в демо вигадані."
        title="Подивіться, як виглядає кабінет будинку"
      />

      <Section tone="quiet">
        <div className="osbb-demo-access">
          <div>
            <Eyebrow>Дані для входу</Eyebrow>
            <h2>{siteSettings.demoHouseName}</h2>
            <p className="osbb-lead">{siteSettings.demoHouseAddress}</p>
          </div>

          <div className="osbb-demo-access__code">
            <span>6-значний код доступу</span>
            <CodeCells code={siteSettings.demoHouseCode} />

            <a
              className="osbb-btn osbb-btn--primary"
              href={siteSettings.demoHouseUrl}
              rel="noreferrer"
              target="_blank"
            >
              Відкрити кабінет
            </a>
          </div>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Що подивитись</Eyebrow>
          <h2>Пройдіться всіма основними розділами</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          {demoSections.map((section) => (
            <Card key={section}>
              <h3>{section}</h3>
              <p>
                Подивіться структуру, картки, документи і спосіб подачі
                інформації для мешканця.
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Важливо</Eyebrow>
          <h2>Демо не підключене до реального будинку</h2>

          <ul className="osbb-check-list osbb-check-list--deep">
            <li>Усі персональні дані вигадані.</li>
            <li>Суми, борги та реквізити не є справжніми.</li>
            <li>Документи показують лише формат роботи кабінету.</li>
            <li>
              Кабінет вашого будинку матиме власну назву, адресу, кольори
              і набір розділів.
            </li>
          </ul>
        </div>
      </Section>

      <CtaBlock
        description="Після перегляду демо залиште контакти — покажемо, як адаптувати кабінет саме під ваш будинок."
        eyebrow="Наступний крок"
        title="Створимо такий кабінет для вашого будинку"
      />
    </main>
  );
}
