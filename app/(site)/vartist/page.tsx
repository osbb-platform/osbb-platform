import { Accordion } from "@/src/modules/site/components/ui/Accordion";
import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";

const priceQuestions = [
  {
    id: "no-money",
    title: "У нас немає на це грошей",
    content:
      "Це плата за весь будинок, а не за квартиру. У перерахунку на квартиру виходять кілька гривень на місяць. Значно менше, ніж будинок втрачає на несвоєчасних оплатах.",
  },
  {
    id: "no-price",
    title: "Чому ви не показуєте ціну на сайті",
    content:
      "Умови залежать від міста, кількості будинків і того, що саме потрібно вашому ОСББ. Ставити на сайті одну цифру для всіх було б нечесно. Ми називаємо вартість після короткої розмови, коли розуміємо ваш будинок.",
  },
  {
    id: "several",
    title: "Чи є окремі умови для кількох будинків",
    content:
      "Так. Для кількох будинків в управлінні діють окремі умови. Точні умови називаємо після короткої розмови.",
  },
] as const;

export default function PricingPage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Вартість"
        description="Разове підключення і щомісячна плата за ведення. Точні умови залежать від міста, кількості будинків і набору можливостей — тому називаємо їх після короткої розмови."
        eyebrow="Вартість"
        note="Якщо ви шукали, скільки коштує сайт для ОСББ і обслуговування ОСББ, — тут ми пояснюємо модель оплати. Сум у гривнях на сайті немає."
        title="Модель проста і зрозуміла"
      />

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Модель оплати</Eyebrow>
          <h2>Два платежі, і обидва зрозумілі</h2>
        </div>

        <div className="osbb-grid osbb-grid--2">
          <Card>
            <span className="osbb-step-number">1</span>
            <h3>Разове підключення</h3>
            <p>
              Створення кабінету і повне наповнення всіх розділів вашого
              будинку.
            </p>
          </Card>

          <Card>
            <span className="osbb-step-number">2</span>
            <h3>Щомісячна плата</h3>
            <p>Ведення, регулярне оновлення і підтримка кабінету.</p>
          </Card>
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Головне</Eyebrow>
          <h2>Плата за будинок, а не за квартиру</h2>
          <p className="osbb-lead osbb-lead--deep">
            Щомісячна плата — це плата за весь будинок, а не за квартиру.
            Розділена на всі квартири, вона виходить у кілька гривень на
            місяць із квартири.
          </p>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Від чого залежить</Eyebrow>
          <h2>Три речі, які впливають на умови</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <h3>Місто</h3>
            <p>Умови в різних містах відрізняються.</p>
          </Card>

          <Card>
            <h3>Кількість будинків</h3>
            <p>
              Для кількох будинків в управлінні діють окремі умови.
            </p>
          </Card>

          <Card>
            <h3>Набір можливостей</h3>
            <p>
              Ви обираєте, які розділи і можливості потрібні вашому
              будинку.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="quiet">
        <div className="osbb-narrow">
          <Eyebrow>Оплата</Eyebrow>
          <h2>Як зручно платити</h2>

          <ul className="osbb-check-list">
            <li>
              Оплату можна вносити наперед — за 3, 6 або 12 місяців.
            </li>
            <li>
              Рахунок виставляється на ОСББ, оплата йде з рахунку будинку.
            </li>
          </ul>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Чесні відповіді</Eyebrow>
          <h2>Питання про гроші</h2>
        </div>

        <div className="osbb-narrow">
          <Accordion items={priceQuestions} />
        </div>
      </Section>

      <CtaBlock
        description="Залиште контакти — зателефонуємо, покажемо кабінет і розрахуємо умови для вашого будинку. Без зобов'язань."
        eyebrow="Заявка"
        title="Підключіть свій будинок"
      />
    </main>
  );
}
