export type CabinetMockupRow = {
  label: string;
  value?: string;
  meta?: string;
  status?: "draft" | "published" | "active" | "completed" | "planned";
};

export type CabinetMockupData = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  activeNavigation: string;
  rows: readonly CabinetMockupRow[];
};

export const cabinetMockups: readonly CabinetMockupData[] = [
  {
    id: "announcements",
    eyebrow: "Оголошення",
    title: "Усі важливі повідомлення в одному місці",
    description:
      "Правління публікує оголошення, а мешканці бачать їх у кабінеті будинку.",
    activeNavigation: "Оголошення",
    rows: [
      {
        label: "Планове відключення води",
        meta: "Сьогодні, 09:30",
        status: "published",
      },
      {
        label: "Збори співвласників",
        meta: "12 серпня",
        status: "published",
      },
      {
        label: "Ремонт у другому під’їзді",
        meta: "Чернетка",
        status: "draft",
      },
    ],
  },
  {
    id: "information",
    eyebrow: "Інформація",
    title: "Матеріали про будинок без пошуку в чатах",
    description:
      "Правила, контакти, пам’ятки та інші постійні матеріали зберігаються структуровано.",
    activeNavigation: "Інформація",
    rows: [
      {
        label: "Правила користування спільним майном",
        meta: "Оновлено 4 серпня",
        status: "published",
      },
      {
        label: "Порядок аварійних звернень",
        meta: "Документ",
        status: "published",
      },
      {
        label: "Графік прийому правління",
        meta: "Пам’ятка",
        status: "published",
      },
    ],
  },
  {
    id: "board",
    eyebrow: "Правління",
    title: "Склад правління та розподіл відповідальності",
    description:
      "Мешканці бачать, хто відповідає за роботу будинку і як зв’язатися.",
    activeNavigation: "Правління",
    rows: [
      {
        label: "Олександр Коваль",
        value: "Голова правління",
        status: "active",
      },
      {
        label: "Марина Петренко",
        value: "Заступниця голови",
        status: "active",
      },
      {
        label: "Ірина Бондар",
        value: "Членкиня правління",
        status: "active",
      },
    ],
  },
  {
    id: "specialists",
    eyebrow: "Спеціалісти",
    title: "Контакти перевірених спеціалістів",
    description:
      "Аварійні служби та майстри доступні мешканцям без пошуку номерів.",
    activeNavigation: "Спеціалісти",
    rows: [
      {
        label: "Аварійний сантехнік",
        value: "+38 (067) 000-00-01",
        status: "active",
      },
      {
        label: "Електрик",
        value: "+38 (067) 000-00-02",
        status: "active",
      },
      {
        label: "Обслуговування ліфтів",
        value: "+38 (067) 000-00-03",
        status: "active",
      },
    ],
  },
  {
    id: "reports",
    eyebrow: "Звіти",
    title: "Фінансові звіти з документами",
    description:
      "Місячні, квартальні та річні звіти доступні мешканцям у зрозумілому вигляді.",
    activeNavigation: "Звіти",
    rows: [
      {
        label: "Звіт за II квартал 2026",
        meta: "PDF · 1,8 МБ",
        status: "published",
      },
      {
        label: "Звіт за травень 2026",
        meta: "PDF · 1,2 МБ",
        status: "published",
      },
      {
        label: "Річний звіт за 2025",
        meta: "PDF · 3,4 МБ",
        status: "published",
      },
    ],
  },
  {
    id: "plan",
    eyebrow: "План робіт",
    title: "Завдання, строки та результат",
    description:
      "Кожна робота має статус, відповідального, підрядника та матеріали до і після виконання.",
    activeNavigation: "План",
    rows: [
      {
        label: "Ремонт покрівлі",
        value: "ТОВ «Будсервіс»",
        meta: "до 18 серпня",
        status: "active",
      },
      {
        label: "Фарбування першого під’їзду",
        value: "Власними силами",
        meta: "до 28 серпня",
        status: "planned",
      },
      {
        label: "Заміна освітлення у дворі",
        meta: "Завершено 30 липня",
        status: "completed",
      },
    ],
  },
  {
    id: "meetings",
    eyebrow: "Збори",
    title: "Питання, голосування та протоколи",
    description:
      "Матеріали зборів зберігаються разом із питаннями та результатами.",
    activeNavigation: "Збори",
    rows: [
      {
        label: "Позачергові збори співвласників",
        meta: "Голосування активне",
        status: "active",
      },
      {
        label: "Затвердження кошторису на 2026 рік",
        meta: "Рішення прийнято",
        status: "completed",
      },
      {
        label: "Вибір підрядника з ремонту покрівлі",
        meta: "Протокол опубліковано",
        status: "published",
      },
    ],
  },
  {
    id: "debtors",
    eyebrow: "Нарахування та боржники",
    title: "Зрозуміла картина розрахунків",
    description:
      "Мешканець перевіряє стан своєї квартири, а правління бачить динаміку по будинку.",
    activeNavigation: "Боржники",
    rows: [
      {
        label: "Квартира 12",
        value: "–3 840,00 грн",
        meta: "3 місяці",
        status: "active",
      },
      {
        label: "Квартира 48",
        value: "–2 160,00 грн",
        meta: "2 місяці",
        status: "active",
      },
      {
        label: "Квартира 73",
        value: "0,00 грн",
        meta: "Без боргу",
        status: "completed",
      },
    ],
  },
  {
    id: "requisites",
    eyebrow: "Реквізити",
    title: "Дані для оплати завжди під рукою",
    description:
      "Рахунок, призначення платежу та реквізити ОСББ доступні в кабінеті.",
    activeNavigation: "Реквізити",
    rows: [
      {
        label: "Одержувач",
        value: "ОСББ «Соборний 186»",
      },
      {
        label: "IBAN",
        value: "UA00 0000 0000 0000 0000 0000 000",
      },
      {
        label: "Призначення платежу",
        value: "Внесок за утримання будинку",
      },
    ],
  },
  {
    id: "documents",
    eyebrow: "Документи",
    title: "Установчі та поточні документи",
    description:
      "Статут, витяги, договори та інші матеріали зберігаються структуровано.",
    activeNavigation: "Документи",
    rows: [
      {
        label: "Статут ОСББ",
        meta: "PDF · 2,1 МБ",
        status: "published",
      },
      {
        label: "Витяг з реєстру",
        meta: "PDF · 840 КБ",
        status: "published",
      },
      {
        label: "Договір обслуговування ліфтів",
        meta: "PDF · 1,4 МБ",
        status: "published",
      },
    ],
  },
  {
    id: "polls",
    eyebrow: "Опитування",
    title: "Думка мешканців до ухвалення рішення",
    description:
      "Правління збирає позиції співвласників за допомогою коротких опитувань.",
    activeNavigation: "Опитування",
    rows: [
      {
        label: "Який колір обрати для під’їзду?",
        meta: "46 відповідей",
        status: "active",
      },
      {
        label: "Чи потрібна велопарковка у дворі?",
        meta: "Завершено",
        status: "completed",
      },
      {
        label: "Оцінка роботи клінінгової компанії",
        meta: "Чернетка",
        status: "draft",
      },
    ],
  },
  {
    id: "home",
    eyebrow: "Головна кабінету",
    title: "Важливе видно одразу",
    description:
      "Оголошення, нові звіти, план робіт і швидкі посилання зібрані на одному екрані.",
    activeNavigation: "Головна",
    rows: [
      {
        label: "Нове оголошення",
        value: "Планове відключення води",
        status: "published",
      },
      {
        label: "План робіт",
        value: "2 активні задачі",
        status: "active",
      },
      {
        label: "Останній звіт",
        value: "II квартал 2026",
        status: "published",
      },
    ],
  },
] as const;

export function getCabinetMockup(id: string) {
  return cabinetMockups.find((mockup) => mockup.id === id) ?? null;
}
