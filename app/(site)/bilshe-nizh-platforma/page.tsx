import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { StatFigure } from "@/src/modules/site/components/ui/StatFigure";

export default function MoreThanPlatformPage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Більше ніж платформа"
        description="OSBB Platform — новий продукт. Але виріс він не на порожньому місці: за ним компанія, яка понад 15 років щодня працює з ОСББ і обслуговує понад 250 об’єктів."
        eyebrow="Хто за нами"
        title="За технологією стоїть п’ятнадцять років практики"
      />

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Компанія-партнер</Eyebrow>
          <h2>
            Бухгалтерський супровід ОСББ, супровід ОСББ і обслуговування
            будинку — щодня понад 15 років
          </h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <StatFigure label="років на ринку" value="15+" />
          <StatFigure label="об’єктів під супроводом" value="250+" />
          <StatFigure label="напрями роботи з будинком" value="3" />
        </div>

        <p className="osbb-section-note osbb-section-note--wide">
          Ми знаємо роботу ОСББ не з презентацій. Ми ведемо їхню
          бухгалтерію, супроводжуємо збори і рішення, працюємо з боржниками
          і документами. OSBB Platform з’явився з цієї щоденної практики —
          як спосіб зняти з голови те, що з’їдає найбільше часу.
        </p>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Послуги партнера</Eyebrow>
          <h2>Що ще ми вміємо</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <h3>Бухгалтерський супровід ОСББ</h3>
            <p>
              Облік, нарахування і звітність об’єднання: від первинних
              документів до звітів для співвласників і контролюючих
              органів.
            </p>
          </Card>

          <Card>
            <h3>Супровід діяльності об’єднання</h3>
            <p>
              Підготовка зборів і протоколів, документообіг будинку, робота
              з боржниками, листування від імені ОСББ.
            </p>
          </Card>

          <Card>
            <h3>Обслуговування будинку</h3>
            <p>
              Технічне утримання: сантехніка, електрика, прибирання,
              планові роботи за графіком і аварійні виїзди.
            </p>
          </Card>
        </div>

        <p className="osbb-section-note osbb-section-note--wide">
          Кабінет можна взяти окремо, а можна разом із супроводом — залежно
          від того, чого не вистачає вашому будинку.
        </p>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Чому це важливо</Eyebrow>
          <h2>Що це означає для вашого будинку</h2>

          <ul className="osbb-check-list osbb-check-list--deep">
            <li>
              Ми розуміємо ваші документи, бо працюємо з такими щодня.
            </li>
            <li>
              Ми не зникнемо через рік: компанія на ринку понад 15 років.
            </li>
            <li>
              У вашому місті буде жива людина, а не лише пошта підтримки.
            </li>
          </ul>
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
