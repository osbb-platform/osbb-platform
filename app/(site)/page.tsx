import Link from "next/link";

import { Accordion } from "@/src/modules/site/components/ui/Accordion";
import { CabinetMockup } from "@/src/modules/site/components/blocks/CabinetMockup";
import { UkraineMap } from "@/src/modules/site/components/blocks/UkraineMap";
import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { Testimonials } from "@/src/modules/site/components/blocks/Testimonials";
import { Card } from "@/src/modules/site/components/ui/Card";
import { CodeCells } from "@/src/modules/site/components/ui/CodeCells";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";
import { StatFigure } from "@/src/modules/site/components/ui/StatFigure";
import {
  siteCities,
  siteSettings,
  siteTestimonials,
} from "@/src/modules/site/data/siteContent";
import { getSiteCounters } from "@/src/modules/site/services/getSiteCounters";
import { getCabinetMockup } from "@/src/modules/site/data/mockupData";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

const commonQuestions = [
  {
    id: "money",
    title: "У нас немає на це грошей",
    content:
      "Це плата за весь будинок, а не за квартиру. У перерахунку на квартиру виходять кілька гривень на місяць. Значно менше, ніж будинок втрачає на несвоєчасних оплатах.",
  },
  {
    id: "time",
    title: "Мені ніколи це все заповнювати",
    content:
      "Вам і не треба. Наповненням і оновленням займається наш менеджер. Від вас — матеріали, які у вас і так є.",
  },
  {
    id: "residents",
    title: "Мешканці не будуть цим користуватись",
    content:
      "Мешканці заходять тоді, коли в кабінеті є те, чого немає ніде: актуальні звіти, суми, рішення зборів, контакти спеціалістів.",
  },
  {
    id: "viber",
    title: "У нас уже є чат у Viber",
    content:
      "Чат — це стрічка, яка тоне. Кабінет — це місце, де документ, звіт чи реквізити лежать на своєму місці і через рік.",
  },
  {
    id: "privacy",
    title: "Ми не хочемо показувати все",
    content:
      "І не треба. Ви самі вирішуєте, які розділи є в кабінеті і що в них публікується.",
  },
  {
    id: "start",
    title: "Що потрібно від нас на старті?",
    content:
      "Логотип або фото будинку, список квартир, реквізити, контакти правління і спеціалістів, документи та звіти, які вже є. Решту робимо ми.",
  },
] as const;

const currentProblems = [
  "Коли дадуть воду?",
  "Чому не працює ліфт?",
  "Коли полагодять освітлення?",
  "Чому не вивезли сміття?",
  "Де проголосувати?",
  "Який номер сантехніка?",
  "Коли збори?",
  "Що вирішили на зборах?",
] as const;

export default async function SiteHomePage() {
  const [homeMockup, siteCounters] = await Promise.all([
    Promise.resolve(getCabinetMockup("home")),
    getSiteCounters(),
  ]);

  if (!homeMockup) {
    throw new Error("Home cabinet mockup is missing");
  }

  return (
    <main id="main">
      <section className="osbb-home-hero">
        <div className="osbb-container osbb-home-hero__grid">
          <div>
            <Eyebrow>Сервіс для ОСББ</Eyebrow>

            <h1>Голова керує будинком. Рутину ведемо ми.</h1>

            <p className="osbb-lead">
              Кожен будинок отримує особистий кабінет: оголошення, звіти,
              збори, борги і документи — в одному місці. Наповнює й оновлює
              його наша команда. Мешканці заходять за 6-значним кодом.
            </p>

            <div className="osbb-actions">
              <Link
                className="osbb-btn osbb-btn--primary"
                href="#zayavka"
              >
                Підключити будинок
              </Link>

              <Link
                className="osbb-btn osbb-btn--secondary"
                href={ROUTES.site.demo}
              >
                Подивитись демо
              </Link>
            </div>

            <div className="osbb-home-hero__access">
              <span>Доступ за персональним кодом</span>
              <CodeCells code={siteSettings.demoHouseCode} />
            </div>
          </div>

          <CabinetMockup data={homeMockup} />
        </div>
      </section>

      {siteCounters ? (
        <Section tight tone="quiet">
          <div className="osbb-grid osbb-grid--4">
            <StatFigure
              label="будинків у системі"
              value={siteCounters.housesLive}
            />
            <StatFigure
              label="матеріалів опубліковано за 30 днів"
              value={siteCounters.materialsLast30}
            />
            <StatFigure
              label="міст присутності"
              value={siteCounters.citiesLive}
            />
            <StatFigure
              label="розділів кабінету"
              value={siteCounters.sectionsCount}
            />
          </div>
        </Section>
      ) : null}

      <Section>
        <div className="osbb-split">
          <div>
            <Eyebrow>Як є зараз</Eyebrow>
            <h2>
              Коли системи немає, голова стає довідковою службою будинку
            </h2>
            <p className="osbb-lead">
              Постійні дзвінки. Пересилання документів у месенджерах. Ті
              самі пояснення кожному окремо. Це забирає вечори і перетворює
              управління будинком на нескінченний ручний режим.
            </p>
          </div>

          <div className="osbb-question-cloud">
            {currentProblems.map((problem) => (
              <span key={problem}>{problem}</span>
            ))}
          </div>
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-split">
          <div>
            <Eyebrow>Рішення</Eyebrow>
            <h2>Один захищений кабінет — і всі відповіді всередині</h2>
            <p className="osbb-lead osbb-lead--deep">
              Без дзвінків. Без паперових оголошень на дверях. Без
              загублених документів у чатах.
            </p>
          </div>

          <div>
            <p className="osbb-deep-copy">
              Розділи вмикаються і вимикаються під ваш будинок. Не потрібен
              розділ — його просто немає в кабінеті.
            </p>

            <Link
              className="osbb-link-arrow"
              href={ROUTES.site.capabilities}
            >
              Подивитись усі можливості →
            </Link>
          </div>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Модель роботи</Eyebrow>
          <h2>Ми знімаємо рутину, а не повноваження</h2>
        </div>

        <div className="osbb-grid osbb-grid--4">
          <Card>
            <h3>Голова ОСББ</h3>
            <p>
              Вирішує, що публікується, і залишається господарем ситуації.
            </p>
          </Card>

          <Card>
            <h3>Кабінет будинку</h3>
            <p>
              Оголошення, звіти, збори і документи — в одному місці.
            </p>
          </Card>

          <Card>
            <h3>Представник у місті</h3>
            <p>
              Приїжджає на об’єкт, збирає матеріали і тримає зв’язок із
              будинком.
            </p>
          </Card>

          <Card>
            <h3>OSBB Platform</h3>
            <p>
              Наповнює й оновлює всі розділи кабінету. Від вас — тільки
              матеріали.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Чому це працює</Eyebrow>
          <h2>Інші дають вам програму. Ми даємо вам результат</h2>
        </div>

        <div className="osbb-comparison">
          <Card>
            <h3>Звичайна програма для ОСББ</h3>
            <ul className="osbb-cross-list">
              <li>Вам видають доступ і кажуть: заповнюйте</li>
              <li>Кожен розділ треба вести самому</li>
              <li>Забули оновити — мешканці бачать старе</li>
              <li>Щоб щось змінити — треба розібратись у системі</li>
            </ul>
          </Card>

          <Card className="osbb-card--accent">
            <h3>OSBB Platform</h3>
            <ul className="osbb-check-list">
              <li>Наповненням займається наш менеджер</li>
              <li>Ви надсилаєте матеріали — решту робимо ми</li>
              <li>Оновлення виходять регулярно, без вашої участі</li>
              <li>Щоб щось змінити — достатньо написати нам</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="osbb-demo-panel">
          <div>
            <Eyebrow>Подивіться самі</Eyebrow>
            <h2>Готовий приклад кабінету — відкритий прямо зараз</h2>

            <dl className="osbb-details-list">
              <div>
                <dt>Адреса кабінету</dt>
                <dd>demo.osbb-platform.com.ua</dd>
              </div>

              <div>
                <dt>Код доступу</dt>
                <dd>
                  <CodeCells code={siteSettings.demoHouseCode} />
                </dd>
              </div>
            </dl>

            <a
              className="osbb-btn osbb-btn--primary"
              href={siteSettings.demoHouseUrl}
              rel="noreferrer"
              target="_blank"
            >
              Відкрити демо-кабінет
            </a>

            <p className="osbb-note">
              Це показовий будинок із вигаданими даними. Так виглядає
              кабінет для мешканця.
            </p>
          </div>

          <CabinetMockup data={homeMockup} />
        </div>
      </Section>

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Де ми працюємо</Eyebrow>
          <h2>Запоріжжя — працюємо. Київ і Одеса — відкриваємо</h2>
        </div>

        <UkraineMap cities={siteCities} />

        <p className="osbb-section-note">
          У кожному місті працює свій представник — він приїжджає на
          об&apos;єкт, знайомиться з головою і залишається на зв&apos;язку з
          будинком.
        </p>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Відгуки</Eyebrow>
          <h2>Що кажуть голови ОСББ</h2>
        </div>

        <Testimonials testimonials={siteTestimonials} />
      </Section>

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Чесні відповіді</Eyebrow>
          <h2>Питання, які ставлять найчастіше</h2>
        </div>

        <div className="osbb-narrow">
          <Accordion items={commonQuestions} />
        </div>
      </Section>

      <Section tight>
        <Eyebrow>Розвиток</Eyebrow>
        <h3>Над чим працюємо зараз</h3>

        <ul className="osbb-soon-list">
          <li>
            <span className="osbb-badge osbb-badge--soon">
              Восени 2026
            </span>
            <p>
              Бот у Viber і Telegram: оновлення будинку приходять у
              месенджер, заходити в кабінет щоразу не обов&apos;язково.
            </p>
          </li>

          <li>
            <span className="osbb-badge osbb-badge--soon">
              Восени 2026
            </span>
            <p>
              Кабінет як застосунок на телефоні — іконка на екрані, без
              магазинів застосунків.
            </p>
          </li>
        </ul>

        <Link className="osbb-link-arrow" href={ROUTES.site.releases}>
          Що ми вже випустили →
        </Link>
      </Section>

      <CtaBlock
        description="Залиште контакти — зателефонуємо, покажемо кабінет і розрахуємо умови для вашого будинку. Без зобов'язань."
        eyebrow="Заявка"
        title="Підключіть свій будинок"
      />
    </main>
  );
}
