type ApprovedCabinetPreviewKind = "home" | "announcements" | "reports" | "plan";

type ApprovedCabinetPreviewProps = {
  kind: ApprovedCabinetPreviewKind;
};

const primaryNavigation = [
  "Оголошення",
  "Звіти",
  "План робіт",
  "Збори",
] as const;

function BrowserFrame({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="osbb-real-preview">
      <div className="osbb-real-preview__browser">
        <div aria-hidden="true" className="osbb-real-preview__dots">
          <span />
          <span />
          <span />
        </div>

        <span className="osbb-real-preview__url">
          demo.osbb-platform.com.ua
        </span>
      </div>

      <div className="osbb-real-preview__cabinet-header">
        <div className="osbb-real-preview__identity">
          <span aria-hidden="true" className="osbb-real-preview__house-icon">
            ⌂
          </span>

          <div>
            <strong>ОСББ «Експрес-4»</strong>
            <small>м. Запоріжжя, вул. Незалежної України, 51</small>
          </div>
        </div>

        <span className="osbb-real-preview__district">
          Вознесенівський район
        </span>

        <span aria-hidden="true" className="osbb-real-preview__bell">
          ◯
        </span>
      </div>

      <nav
        aria-label="Розділи показового кабінету"
        className="osbb-real-preview__navigation"
      >
        <span className={active === "Головна" ? "is-active" : undefined}>
          Головна
        </span>

        {primaryNavigation.map((item) => (
          <span
            className={active === item ? "is-active" : undefined}
            key={item}
          >
            {item}
          </span>
        ))}

        <span>Розділи</span>
      </nav>

      <div className="osbb-real-preview__content">{children}</div>
    </div>
  );
}

function HomePreview() {
  return (
    <BrowserFrame active="Головна">
      <div className="osbb-real-preview__cover">
        <p>Усе важливе про будинок — в одному кабінеті</p>
        <span>
          Швидкий доступ до головних розділів та важливої інформації будинку.
        </span>
      </div>

      <div className="osbb-real-preview__quick-grid">
        <article>
          <small>Найближчі збори</small>
          <strong>14 серпня 2026 р.</strong>
          <span>18:30 · у дворі будинку</span>
        </article>

        <article>
          <small>Важлива інформація</small>
          <strong>Планове відключення води</strong>
          <span>12 серпня · з 09:00 до 15:00</span>
        </article>

        <article>
          <small>Активне голосування</small>
          <strong>Облаштування укриття</strong>
          <span>До завершення — 4 дні</span>
        </article>

        <article>
          <small>Стан оплат</small>
          <strong>87% квартир сплатили</strong>
          <span>Дані актуальні на 01.08.2026</span>
        </article>
      </div>

      <div className="osbb-real-preview__section-cards">
        <article>
          <strong>Оголошення</strong>
          <span>Останні повідомлення правління</span>
          <small>Відкрити розділ →</small>
        </article>

        <article>
          <strong>Звіти</strong>
          <span>Фінансова звітність за періодами</span>
          <small>Відкрити розділ →</small>
        </article>

        <article>
          <strong>План робіт</strong>
          <span>Заплановані та виконані роботи</span>
          <small>Відкрити розділ →</small>
        </article>
      </div>
    </BrowserFrame>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="osbb-real-preview__section-header">
      <h3>{title}</h3>
      <p>{description}</p>
    </header>
  );
}

function AnnouncementsPreview() {
  return (
    <BrowserFrame active="Оголошення">
      <SectionHeader
        description="Актуальні повідомлення та важлива інформація для мешканців."
        title="Оголошення"
      />

      <div className="osbb-real-preview__tabs">
        <span className="is-active">Усі</span>
        <span>Важливі</span>
        <span>Звернути увагу</span>
        <span>Звичайні</span>
      </div>

      <div className="osbb-real-preview__list">
        <article>
          <div>
            <span className="osbb-real-preview__priority">Важливе</span>
            <strong>Планове відключення води</strong>
            <p>12 серпня з 09:00 до 15:00 через ремонтні роботи.</p>
          </div>
          <time>08.08.2026</time>
        </article>

        <article>
          <div>
            <span className="osbb-real-preview__attention">Звернути увагу</span>
            <strong>Загальні збори співвласників</strong>
            <p>Збори відбудуться 14 серпня о 18:30 у дворі будинку.</p>
          </div>
          <time>05.08.2026</time>
        </article>

        <article>
          <div>
            <span className="osbb-real-preview__ordinary">Звичайне</span>
            <strong>Завершено прибирання підвального приміщення</strong>
            <p>Дякуємо мешканцям за допомогу.</p>
          </div>
          <time>01.08.2026</time>
        </article>
      </div>
    </BrowserFrame>
  );
}

function ReportsPreview() {
  return (
    <BrowserFrame active="Звіти">
      <SectionHeader
        description="Фінансові звіти та підтверджуючі документи будинку."
        title="Звіти"
      />

      <div className="osbb-real-preview__filters">
        <span>2026 рік</span>
        <span>Усі періоди</span>
        <span>Усі категорії</span>
      </div>

      <div className="osbb-real-preview__report-groups">
        <section>
          <div>
            <strong>Серпень 2026</strong>
            <span>Місячний звіт</span>
          </div>

          <article>
            <div>
              <strong>Звіт про надходження та витрати</strong>
              <small>PDF · 1,8 МБ</small>
            </div>
            <span>Відкрити PDF</span>
          </article>
        </section>

        <section>
          <div>
            <strong>II квартал 2026</strong>
            <span>Квартальний звіт</span>
          </div>

          <article>
            <div>
              <strong>Фінансовий звіт за квартал</strong>
              <small>PDF · 2,4 МБ</small>
            </div>
            <span>Відкрити PDF</span>
          </article>
        </section>

        <section>
          <div>
            <strong>2025 рік</strong>
            <span>Річний звіт</span>
          </div>

          <article>
            <div>
              <strong>Підсумковий фінансовий звіт</strong>
              <small>PDF · 4,1 МБ</small>
            </div>
            <span>Відкрити PDF</span>
          </article>
        </section>
      </div>
    </BrowserFrame>
  );
}

function PlanPreview() {
  return (
    <BrowserFrame active="План робіт">
      <SectionHeader
        description="Заплановані, поточні та завершені роботи по будинку."
        title="План робіт"
      />

      <div className="osbb-real-preview__tabs">
        <span className="is-active">Усі роботи</span>
        <span>Заплановано</span>
        <span>В роботі</span>
        <span>Виконано</span>
      </div>

      <div className="osbb-real-preview__plan-list">
        <article>
          <div className="osbb-real-preview__plan-head">
            <span className="osbb-real-preview__status--active">В роботі</span>
            <small>Високий пріоритет</small>
          </div>

          <strong>Ремонт покрівлі над третім під’їздом</strong>
          <p>Підрядник: ТОВ «Будсервіс» · дедлайн 20.08.2026</p>

          <div className="osbb-real-preview__progress">
            <span style={{ width: "68%" }} />
          </div>
        </article>

        <article>
          <div className="osbb-real-preview__plan-head">
            <span className="osbb-real-preview__status--planned">
              Заплановано
            </span>
            <small>Середній пріоритет</small>
          </div>

          <strong>Заміна освітлення у другому під’їзді</strong>
          <p>Початок 01.09.2026 · відповідальний: член правління</p>
        </article>

        <article>
          <div className="osbb-real-preview__plan-head">
            <span className="osbb-real-preview__status--done">Виконано</span>
            <small>Завершено 28.07.2026</small>
          </div>

          <strong>Фарбування дитячого майданчика</strong>
          <p>Додано фотографії до та після виконання.</p>
        </article>
      </div>
    </BrowserFrame>
  );
}

export function ApprovedCabinetPreview({ kind }: ApprovedCabinetPreviewProps) {
  switch (kind) {
    case "home":
      return <HomePreview />;
    case "announcements":
      return <AnnouncementsPreview />;
    case "reports":
      return <ReportsPreview />;
    case "plan":
      return <PlanPreview />;
  }
}
