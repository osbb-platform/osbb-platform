import { Breadcrumbs } from "@/src/modules/site/components/layout/Breadcrumbs";
import { siteSettings } from "@/src/modules/site/data/siteContent";

const sections = [
  {
    id: "controller",
    title: "Хто обробляє ваші дані",
  },
  {
    id: "data",
    title: "Які дані ми збираємо",
  },
  {
    id: "purpose",
    title: "Навіщо ми їх використовуємо",
  },
  {
    id: "sharing",
    title: "Кому передаємо",
  },
  {
    id: "retention",
    title: "Скільки зберігаємо",
  },
  {
    id: "rights",
    title: "Ваші права",
  },
  {
    id: "cookies",
    title: "Файли cookie й аналітика",
  },
  {
    id: "contacts",
    title: "Як з нами зв’язатися",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main id="main">
      <Breadcrumbs
        items={[
          {
            label: "Політика конфіденційності",
          },
        ]}
      />

      <article className="osbb-legal">
        <header className="osbb-container osbb-legal__header">
          <p className="osbb-eyebrow">Документ</p>
          <h1>Політика конфіденційності</h1>
          <p className="osbb-lead">Оновлено 3 серпня 2026 року</p>
        </header>

        <div className="osbb-container osbb-legal__layout">
          <aside>
            <nav aria-label="Зміст політики">
              {sections.map((section, index) => (
                <a href={`#${section.id}`} key={section.id}>
                  {index + 1}. {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="osbb-legal__content">
            <section id="controller">
              <h2>Хто обробляє ваші дані</h2>

              <p>
                Володільцем персональних даних відвідувачів сайту
                osbb-platform.com.ua є {siteSettings.legalName}. Питання
                щодо обробки даних надсилайте на{" "}
                <a href={`mailto:${siteSettings.email}`}>
                  {siteSettings.email}
                </a>{" "}
                або телефонуйте за номером{" "}
                <a
                  href={`tel:${siteSettings.primaryPhone.replace(
                    /[^\d+]/g,
                    "",
                  )}`}
                >
                  {siteSettings.primaryPhone}
                </a>
                .
              </p>
            </section>

            <section id="data">
              <h2>Які дані ми збираємо</h2>

              <p>
                Дані, які ви залишаєте у формі заявки: ім’я, номер телефона,
                місто і роль у будинку. Технічні дані відвідування: адреса
                сторінки, джерело переходу, тип пристрою і браузера. Ми не
                збираємо дані про мешканців будинків через цей сайт.
              </p>
            </section>

            <section id="purpose">
              <h2>Навіщо ми їх використовуємо</h2>

              <p>
                Щоб зателефонувати вам у відповідь на заявку, підготувати
                умови для вашого будинку і відповісти на питання. Технічні
                дані використовуємо, щоб розуміти, які сторінки корисні
                відвідувачам, і виправляти помилки.
              </p>
            </section>

            <section id="sharing">
              <h2>Кому передаємо</h2>

              <p>
                Даними користуються співробітники OSBB Platform і
                компанії-партнера, які обробляють заявки. Ми не продаємо і
                не передаємо дані третім особам для рекламних цілей.
                Передача можлива лише на вимогу закону.
              </p>
            </section>

            <section id="retention">
              <h2>Скільки зберігаємо</h2>

              <p>
                Дані заявки зберігаємо, поки вони потрібні для роботи з
                вашим зверненням, і не довше трьох років після останнього
                контакту. Ви можете попросити видалити їх раніше.
              </p>
            </section>

            <section id="rights">
              <h2>Ваші права</h2>

              <p>
                Ви можете дізнатись, які ваші дані ми зберігаємо, виправити
                їх, попросити видалити або відкликати згоду на обробку. Для
                цього напишіть на{" "}
                <a href={`mailto:${siteSettings.email}`}>
                  {siteSettings.email}
                </a>{" "}
                — відповідаємо протягом тридцяти днів.
              </p>
            </section>

            <section id="cookies">
              <h2>Файли cookie й аналітика</h2>

              <p>
                Сайт використовує технічні файли cookie, потрібні для його
                роботи, і знеособлену статистику відвідувань. Ви можете
                вимкнути cookie в налаштуваннях браузера — основні сторінки
                працюватимуть далі.
              </p>
            </section>

            <section id="contacts">
              <h2>Як з нами зв’язатися</h2>

              <p>
                Пошта:{" "}
                <a href={`mailto:${siteSettings.email}`}>
                  {siteSettings.email}
                </a>
                . Телефон:{" "}
                <a
                  href={`tel:${siteSettings.primaryPhone.replace(
                    /[^\d+]/g,
                    "",
                  )}`}
                >
                  {siteSettings.primaryPhone}
                </a>
                . Ми відповідаємо в робочий час,{" "}
                {siteSettings.workingHours}.
              </p>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
