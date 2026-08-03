export type SiteCityStatus = "live" | "opening";

export type SiteSettingsContent = {
  organizationName: string;
  legalName: string;
  primaryPhone: string;
  secondaryPhone: string;
  email: string;
  telegramUrl: string;
  telegramHandle: string;
  whatsappUrl: string;
  officeAddress: string;
  workingHours: string;
  partnerName: string;
  partnerCity: string;
  partnerExperience: string;
  demoHouseName: string;
  demoHouseAddress: string;
  demoHouseCode: string;
  demoHouseUrl: string;
};

export type SiteCityContent = {
  slug: "zaporizhzhia" | "kyiv" | "odesa";
  name: string;
  nameLocative: string;
  status: SiteCityStatus;
  housesCount: number;
  mapX: number;
  mapY: number;
};

export type SiteTestimonialContent = {
  id: string;
  authorName: string;
  authorRole: string;
  city: string;
  quote: string;
  sortOrder: number;
};

export type SiteReleaseStatus = "released" | "planned";

export type SiteReleaseContent = {
  slug: string;
  title: string;
  summary: string;
  periodLabel: string;
  status: SiteReleaseStatus;
  statusLabel: string;
  sortOrder: number;
};

export type SitePostContent = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  publishedLabel: string;
  featured: boolean;
  sortOrder: number;
};

export const siteSettings: SiteSettingsContent = {
  organizationName: "OSBB Platform",
  legalName: "OSBB Platform",
  primaryPhone: "+38 (067) 512-84-30",
  secondaryPhone: "+38 (061) 270-15-40",
  email: "hello@osbb-platform.com.ua",
  telegramUrl: "https://t.me/osbb_platform",
  telegramHandle: "@osbb_platform",
  whatsappUrl: "https://wa.me/380675128430",
  officeAddress: "Запоріжжя",
  workingHours: "Пн–Пт, 9:00–18:00",
  partnerName: "ТОВ «Бухгалтер онлайн»",
  partnerCity: "Запоріжжя",
  partnerExperience: "понад 15 років",
  demoHouseName: "ОСББ «Соборний 186»",
  demoHouseAddress: "вул. Соборна, 186",
  demoHouseCode: "301545",
  demoHouseUrl: "https://demo.osbb-platform.com.ua",
};

export const siteCities: readonly SiteCityContent[] = [
  {
    slug: "zaporizhzhia",
    name: "Запоріжжя",
    nameLocative: "у Запоріжжі",
    status: "live",
    housesCount: 250,
    mapX: 75,
    mapY: 58,
  },
  {
    slug: "kyiv",
    name: "Київ",
    nameLocative: "у Києві",
    status: "opening",
    housesCount: 0,
    mapX: 52,
    mapY: 28,
  },
  {
    slug: "odesa",
    name: "Одеса",
    nameLocative: "в Одесі",
    status: "opening",
    housesCount: 0,
    mapX: 48,
    mapY: 72,
  },
] as const;

export const siteTestimonials: readonly SiteTestimonialContent[] = [
  {
    id: "olena-tkachenko",
    authorName: "Олена Ткаченко",
    authorRole: "голова ОСББ",
    city: "Запоріжжя",
    quote:
      "Раніше телефон дзвонив і ввечері, і у вихідні. Тепер я кажу: подивіться в кабінеті — там усе є. За півроку дзвінків стало в кілька разів менше.",
    sortOrder: 1,
  },
  {
    id: "serhii-romaniuk",
    authorName: "Сергій Романюк",
    authorRole: "голова ОСББ",
    city: "Запоріжжя",
    quote:
      "Найбільше цінують звіти. Люди перестали питати, куди йдуть гроші, бо бачать документи самі. На зборах стало значно спокійніше.",
    sortOrder: 2,
  },
  {
    id: "iryna-didukh",
    authorName: "Ірина Дідух",
    authorRole: "керує кількома будинками",
    city: "Запоріжжя",
    quote:
      "У мене чотири будинки. Раніше кожен вимагав окремої уваги, тепер матеріали передаю одним пакетом і бачу результат у кабінетах.",
    sortOrder: 3,
  },
] as const;

export const siteReleases: readonly SiteReleaseContent[] = [
  {
    slug: "online-voting-electronic-signature",
    title: "Онлайн-голосування з електронним підписом",
    summary:
      "Співвласник відкриває активне голосування в кабінеті, обирає свою квартиру, вказує площу і підтверджує особу електронним підписом. Голос фіксується, результат видно одразу.",
    periodLabel: "Червень 2026",
    status: "released",
    statusLabel: "Випущено",
    sortOrder: 1,
  },
  {
    slug: "debtors-month-threshold",
    title: "Список боржників із порогом у місяцях",
    summary:
      "Поріг боргу рахується не в гривнях, а в місяцях — однаково справедливо для однокімнатної і трикімнатної квартири. Мешканець може перевірити баланс своєї квартири через пошук.",
    periodLabel: "Травень 2026",
    status: "released",
    statusLabel: "Випущено",
    sortOrder: 2,
  },
  {
    slug: "accounting-program-integration",
    title: "Інтеграція з бухгалтерською програмою будинку",
    summary:
      "Нарахування і баланси потрапляють у кабінет із бухгалтерської програми будинку. Дані в розділі «Нарахування та боржники» оновлюються без ручного перенесення.",
    periodLabel: "Березень 2026",
    status: "released",
    statusLabel: "Випущено",
    sortOrder: 3,
  },
  {
    slug: "work-plan-contractors",
    title: "План робіт із підрядниками",
    summary:
      "Кожна робота має три статуси, дату початку, дедлайн і фактичне завершення, підрядника і відповідального. Фото «до / після» та документи прикріплюються до задачі.",
    periodLabel: "Лютий 2026",
    status: "released",
    statusLabel: "Випущено",
    sortOrder: 4,
  },
  {
    slug: "polls-section",
    title: "Розділ «Опитування»",
    summary:
      "П’ять типів питань, відкритий або анонімний режим, одна відповідь від квартири. Результати можна показати одразу, після завершення або приховати.",
    periodLabel: "Грудень 2025",
    status: "released",
    statusLabel: "Випущено",
    sortOrder: 5,
  },
  {
    slug: "viber-telegram-bot",
    title: "Бот у Viber і Telegram",
    summary:
      "Оновлення будинку приходять у месенджер — заходити в кабінет щоразу не обов’язково. Кожен сам обирає, про що отримувати сповіщення. Через бота можна буде подивитись стан свого рахунку і поставити запит. Підключення до бота — з кабінету свого будинку.",
    periodLabel: "Восени 2026",
    status: "planned",
    statusLabel: "Восени 2026",
    sortOrder: 6,
  },
  {
    slug: "mobile-home-screen-app",
    title: "Кабінет як застосунок на телефоні",
    summary: "Іконка на екрані, без магазинів застосунків.",
    periodLabel: "Восени 2026",
    status: "planned",
    statusLabel: "Восени 2026",
    sortOrder: 7,
  },
] as const;

export const sitePosts: readonly SitePostContent[] = [
  {
    slug: "kvorum-za-ploshcheyu-yak-ne-zirvaty-zbory",
    title: "Кворум за площею: як не зірвати збори",
    excerpt:
      "Кворум рахується не за кількістю людей, а за площею. Розбираємо, як його порахувати заздалегідь і що робити, якщо частина співвласників не виходить на зв’язок.",
    category: "Закон і документи",
    publishedAt: "2026-08-01",
    publishedLabel: "1 серпня 2026",
    featured: true,
    sortOrder: 1,
  },
  {
    slug: "yak-provesty-zbory-koly-spivvlasnyky-za-kordonom",
    title: "Як провести збори, коли частина співвласників за кордоном",
    excerpt:
      "Що врахувати при підготовці, як зібрати позиції і які документи знадобляться для протоколу.",
    category: "Практика голови",
    publishedAt: "2026-07-28",
    publishedLabel: "28 липня 2026",
    featured: false,
    sortOrder: 2,
  },
  {
    slug: "shcho-robyty-z-borhamy-poryadok-diy",
    title: "Що робити з боргами: порядок дій для правління",
    excerpt:
      "Від першого нагадування до претензії: послідовність, яка не порушує прав співвласника.",
    category: "Гроші будинку",
    publishedAt: "2026-07-21",
    publishedLabel: "21 липня 2026",
    featured: false,
    sortOrder: 3,
  },
  {
    slug: "yaki-dokumenty-osbb-mayut-buty-dostupni",
    title: "Які документи ОСББ мають бути доступні співвласникам",
    excerpt:
      "Перелік документів, які правління зобов’язане надати на запит, і в які строки.",
    category: "Закон і документи",
    publishedAt: "2026-07-14",
    publishedLabel: "14 липня 2026",
    featured: false,
    sortOrder: 4,
  },
  {
    slug: "yak-peredaty-spravy-novomu-holovi",
    title: "Як передати справи новому голові без втрати документів",
    excerpt:
      "Опис, акт передачі та мінімальний набір, без якого новий голова не почне роботу.",
    category: "Практика голови",
    publishedAt: "2026-07-07",
    publishedLabel: "7 липня 2026",
    featured: false,
    sortOrder: 5,
  },
  {
    slug: "protokol-zboriv-shcho-maye-buty",
    title: "Протокол зборів: що в ньому має бути обов’язково",
    excerpt:
      "Структура протоколу, типові помилки і чому рішення інколи оскаржують.",
    category: "Закон і документи",
    publishedAt: "2026-06-30",
    publishedLabel: "30 червня 2026",
    featured: false,
    sortOrder: 6,
  },
  {
    slug: "koshtorys-na-rik",
    title: "Кошторис на рік: із чого він складається",
    excerpt:
      "Розбір статей кошторису і як пояснити його співвласникам простими словами.",
    category: "Гроші будинку",
    publishedAt: "2026-06-23",
    publishedLabel: "23 червня 2026",
    featured: false,
    sortOrder: 7,
  },
  {
    slug: "plan-robit-na-sezon",
    title: "План робіт на сезон: як не забути про дрібниці",
    excerpt:
      "Що зазвичай випадає з плану і як вибудувати перелік робіт на рік.",
    category: "Практика голови",
    publishedAt: "2026-06-16",
    publishedLabel: "16 червня 2026",
    featured: false,
    sortOrder: 8,
  },
  {
    slug: "statut-osbb-koly-i-yak-zminyuyut",
    title: "Статут ОСББ: коли і як його змінюють",
    excerpt:
      "Підстави для змін, порядок ухвалення і реєстрації нової редакції.",
    category: "Закон і документи",
    publishedAt: "2026-06-09",
    publishedLabel: "9 червня 2026",
    featured: false,
    sortOrder: 9,
  },
  {
    slug: "online-voting-for-co-owner",
    title: "Онлайн-голосування: як це працює для співвласника",
    excerpt:
      "Чотири кроки в кабінеті, підтвердження особи і чому голос не змінюється.",
    category: "Оновлення платформи",
    publishedAt: "2026-06-02",
    publishedLabel: "2 червня 2026",
    featured: false,
    sortOrder: 10,
  },
] as const;

export const sitePrototypeFigures = {
  houses: 250,
  districts: 9,
  cities: 1,
  cabinetSections: 12,
} as const;

export const sitePageTitles = {
  home: "OSBB Platform",
  capabilities: "Можливості",
  howItWorks: "Як це працює",
  pricing: "Вартість",
  moreThanPlatform: "Більше, ніж платформа",
  demo: "Демо",
  findHouse: "Знайти будинок",
  residents: "Мешканцям",
  blog: "Блог",
  releases: "Оновлення",
  contacts: "Контакти",
  privacy: "Політика конфіденційності",
} as const;

export function getSiteCity(slug: SiteCityContent["slug"]) {
  const city = siteCities.find((item) => item.slug === slug);

  if (!city) {
    throw new Error(`Site city is not configured: ${slug}`);
  }

  return city;
}

export function getSitePost(slug: string) {
  return sitePosts.find((post) => post.slug === slug) ?? null;
}
