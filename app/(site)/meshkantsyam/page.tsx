import { Accordion } from "@/src/modules/site/components/ui/Accordion";
import { CtaBlock } from "@/src/modules/site/components/blocks/CtaBlock";
import { HouseSearch } from "@/src/modules/site/components/blocks/HouseSearch";
import { PageHero } from "@/src/modules/site/components/blocks/PageHero";
import { Card } from "@/src/modules/site/components/ui/Card";
import { Eyebrow } from "@/src/modules/site/components/ui/Eyebrow";
import { Section } from "@/src/modules/site/components/ui/Section";

const residentQuestions = [
  {
    id: "access",
    title: "Де взяти код доступу?",
    content:
      "Код видає правління або керуюча компанія вашого будинку. Для кожного будинку діє свій код.",
  },
  {
    id: "registration",
    title: "Чи потрібно реєструватися?",
    content:
      "Ні. Для входу достатньо відкрити адресу будинку і ввести 6-значний код.",
  },
  {
    id: "personal-data",
    title: "Чи потрібно вказувати персональні дані?",
    content:
      "Для перегляду загальних матеріалів будинку реєстрація і введення персональних даних не потрібні.",
  },
  {
    id: "wrong-data",
    title: "Що робити, якщо в кабінеті помилка?",
    content:
      "Зверніться до правління або скористайтеся формою звернення всередині кабінету будинку.",
  },
] as const;

export default function ResidentsPage() {
  return (
    <main id="main">
      <PageHero
        breadcrumb="Мешканцям"
        description="Знайдіть свій будинок, введіть 6-значний код і відкрийте оголошення, звіти, збори, документи та іншу інформацію."
        eyebrow="Мешканцям"
        title="Усе про ваш будинок — в одному кабінеті"
      />

      <Section tone="quiet">
        <div className="osbb-head">
          <Eyebrow>Знайти будинок</Eyebrow>
          <h2>Почніть з адреси або назви ОСББ</h2>
        </div>

        <HouseSearch />
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Що є в кабінеті</Eyebrow>
          <h2>Інформація, яку раніше доводилося шукати в чатах</h2>
        </div>

        <div className="osbb-grid osbb-grid--3">
          <Card>
            <h3>Оголошення</h3>
            <p>
              Планові роботи, відключення, збори та інші повідомлення
              будинку.
            </p>
          </Card>

          <Card>
            <h3>Звіти і документи</h3>
            <p>
              Місячні, квартальні та річні звіти, протоколи, статут і
              договори.
            </p>
          </Card>

          <Card>
            <h3>План робіт</h3>
            <p>
              Що заплановано, що зараз у роботі і що вже завершено.
            </p>
          </Card>

          <Card>
            <h3>Збори і голосування</h3>
            <p>
              Порядок денний, питання, результати та підсумкові протоколи.
            </p>
          </Card>

          <Card>
            <h3>Розрахунки</h3>
            <p>
              Стан заборгованості по будинку та пошук інформації по своїй
              квартирі.
            </p>
          </Card>

          <Card>
            <h3>Контакти</h3>
            <p>
              Правління, спеціалісти, аварійні служби і реквізити для
              оплати.
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="deep">
        <div className="osbb-narrow">
          <Eyebrow>Вхід</Eyebrow>
          <h2>Без реєстрації, паролів і електронної пошти</h2>

          <ul className="osbb-check-list osbb-check-list--deep">
            <li>Кожен будинок має власну адресу кабінету.</li>
            <li>Для входу використовується 6-значний код.</li>
            <li>Код можна отримати у голови або правління ОСББ.</li>
            <li>Старий код перестає працювати одразу після його заміни.</li>
          </ul>
        </div>
      </Section>

      <Section>
        <div className="osbb-head">
          <Eyebrow>Питання</Eyebrow>
          <h2>Як користуватися кабінетом</h2>
        </div>

        <div className="osbb-narrow">
          <Accordion items={residentQuestions} />
        </div>
      </Section>

      <CtaBlock
        description="Кабінету вашого будинку ще немає? Передайте контакти голови або правління — ми розповімо про підключення."
        eyebrow="Немає вашого будинку?"
        title="Запропонуйте правлінню підключити кабінет"
      />
    </main>
  );
}
