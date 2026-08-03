import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";

const launchSteps = [
  {
    title: "Заявка і розмова",
    text: "Ви залишаєте контакти. Ми телефонуємо, розпитуємо про будинок і домовляємось про зустріч.",
  },
  {
    title: "Зустріч на об’єкті",
    text: "Представник міста приїжджає до будинку і знайомиться з головою.",
  },
  {
    title: "Збір матеріалів",
    text: "Забираємо логотип або фото будинку, список квартир, реквізити, контакти правління і спеціалістів, документи та звіти, які вже є. Один раз.",
  },
  {
    title: "Створення кабінету",
    text: "Робимо кабінет вашого будинку: адреса, обкладинка, назва, кольоровий акцент. Разом вирішуємо, які розділи потрібні.",
  },
  {
    title: "Наповнення розділів",
    text: "Наш менеджер публікує оголошення, звіти, план робіт, збори, реквізити, контакти і документи.",
  },
  {
    title: "Видача кодів мешканцям",
    text: "Ви отримуєте 6-значний код будинку і роздаєте його співвласникам.",
  },
  {
    title: "Ведення й оновлення",
    text: "Далі кабінет оновлюємо ми. Від вас — тільки нові матеріали, коли вони з’являються.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Як це працює"
        description="Ви передаєте матеріали один раз. Ми створюємо кабінет, наповнюємо його і ведемо далі. Мешканці заходять за 6-значним кодом."
        eyebrow="Як це працює"
        title="Від першої розмови до готового кабінету"
      />

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>У трьох кроках</Eyebrow>
          <h2>Що відбувається після заявки</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <span className="osbb-step-number">1</span>
            <h3>Ви передаєте матеріали</h3>
            <p>
              Документи, реквізити, контакти і те, що вже є у вашого
              будинку.
            </p>
          </Card>

          <Card>
            <span className="osbb-step-number">2</span>
            <h3>Ми наповнюємо кабінет</h3>
            <p>
              Наш менеджер публікує і регулярно оновлює розділи.
            </p>
          </Card>

          <Card>
            <span className="osbb-step-number">3</span>
            <h3>Мешканці відкривають кабінет</h3>
            <p>За 6-значним кодом, із телефона чи комп’ютера.</p>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Модель роботи</Eyebrow>
          <h2>Голова, команда сервісу і представник у вашому місті</h2>
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
          <Eyebrow>Запуск</Eyebrow>
          <h2>Як підключається будинок</h2>
        </div>

        <div className="osbb-grid osbb-grid--2 osbb-launch-options">
          <Card>
            <h3>Якщо документи вже зібрані</h3>
            <p>
              Кілька днів від передачі матеріалів до видачі кодів
              мешканцям.
            </p>
          </Card>

          <Card>
            <h3>Якщо починаємо з нуля</h3>
            <p>
              Представник приїжджає на об’єкт, знайомиться з головою і
              допомагає зібрати матеріали. Далі — створення й наповнення
              кабінету.
            </p>
          </Card>
        </div>

        <ol className="osbb-timeline">
          {launchSteps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Розподіл роботи</Eyebrow>
          <h2>Що від вас і що від нас</h2>
        </div>

        <div className="osbb-comparison">
          <Card>
            <h3>Від вас — один раз</h3>
            <ul className="osbb-check-list">
              <li>Логотип або фото будинку</li>
              <li>Список квартир</li>
              <li>Реквізити для оплати</li>
              <li>Контакти правління і спеціалістів</li>
              <li>Документи та звіти, які вже є</li>
            </ul>
          </Card>

          <Card className="osbb-card--accent">
            <h3>Від нас — постійно</h3>
            <ul className="osbb-check-list">
              <li>Створюємо кабінет</li>
              <li>Наповнюємо всі розділи</li>
              <li>Налаштовуємо вигляд під ваш будинок</li>
              <li>Видаємо код доступу для мешканців</li>
              <li>Ведемо і оновлюємо кабінет далі</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Налаштування</Eyebrow>
          <h2>Кабінет налаштовується під ваш будинок</h2>

          <ul className="osbb-check-list osbb-check-list--deep">
            <li>
              Розділи вмикаються і вимикаються. Не потрібен розділ — його
              просто немає в кабінеті.
            </li>
            <li>
              Ви самі вирішуєте, що публікується, а що залишається
              всередині правління.
            </li>
            <li>
              Кожен будинок має свій вигляд: обкладинка, назва, кольоровий
              акцент.
            </li>
            <li>
              Категорії всередині розділів налаштовуються: свої типи
              спеціалістів, свої категорії звітів і матеріалів.
            </li>
            <li>
              Мешканці бачать рівно те, що ви вирішили показати.
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
