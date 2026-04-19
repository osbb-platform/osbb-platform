export const houseCopy = {
  common: {
    houseFallback: "Будинок",
  },

  passwordGate: {
    heroBadge: "Простір для мешканців",
    heroTitle: "Важлива інформація будинку — в одному захищеному кабінеті",
    heroDescription:
      "Після входу ви зможете переглядати оголошення, корисну інформацію, звіти, контакти та інші внутрішні розділи будинку.",
    cabinetTitle: "Особистий кабінет",
    address: "Адреса будинку",
    access: "Доступ",
    accessDescription:
      "Лише для мешканців та користувачів із кодом доступу",
    loginFormat: "Формат входу",
    loginFormatDescription: "Персональний 6-значний код доступу",
    fallbackDescription:
      "Тут зібрана важлива інформація для мешканців будинку: оголошення, звіти, контакти та інші внутрішні розділи.",
    lockedMessage: "Для безпеки вхід тимчасово призупинено.",
    enterCode: "Введіть код доступу",
    enterCodeHint: "Використовуйте 6 цифр, щоб відкрити кабінет будинку.",
  },

  navigation: {
    announcements: "Оголошення",
    reports: "Звіти",
    plan: "План робіт",
    meetings: "Збори",
    board: "Правління",
    information: "Інформація",
    requisites: "Реквізити",
    specialists: "Спеціалісти",
    debtors: "Боржники",
    openMenu: "Відкрити меню розділів",
  },

  sidePanel: {
    allSections: "Усі розділи будинку",
    closeMenu: "Закрити меню",
    managementCompany: "Керуюча компанія",
    description:
      "Зв’язатися з керуючою компанією та надіслати звернення можна на головній сторінці будинку.",
  },

  bell: {
    aria: "Останні оновлення",
    title: "Останні оновлення",
    period: "За останні 7 днів",
    empty: "За останні 7 днів оновлень не було",
  },

  footer: {
    successTitle: "Повідомлення надіслано",
    successText: "Дякуємо. Ваше звернення передано керуючій компанії.",
    subject: "Тема звернення",
    subjectManagementCompany: "Повідомлення для керуючої компанії",
    subjectImprovement: "Запропонувати покращення",
    subjectOther: "Інше",
    namePlaceholder: "Ім’я",
    emailPlaceholder: "E-mail",
    apartment: "Квартира",
    selectApartment: "Оберіть квартиру",
    apartmentShort: "Кв.",
    improvementPlaceholder: "Опишіть вашу ідею або пропозицію",
    messagePlaceholder: "Введіть повідомлення",
    sendPending: "Надсилаємо...",
    send: "Надіслати",
    writeUs: "Написати нам",
    modalEyebrow: "Керуюча компанія",
    modalTitle: "Написати нам",
    modalDescriptionImprovement:
      "Оберіть тему звернення та залиште повідомлення. Ми передамо його керуючій компанії.",
    modalDescriptionDefault:
      "Оберіть тему звернення та залиште повідомлення. Керуюча компанія отримає ваш запит.",
    companyLogoAlt: "Логотип керуючої компанії",
    phone: "Телефон",
    email: "E-mail",
    address: "Адреса",
    schedule: "Графік роботи",
    scheduleValue: "Понеділок - П’ятниця 09:00 - 18:00",
  },
} as const;

export const houseHomeCopy = {
  alert: {
    label: "Інформація",
    open: "Відкрити розділ",
  },

  hero: {
    badge: "Кабінет будинку",

    sections: {
      announcements: "Оголошення",
      reports: "Звіти",
      plan: "План робіт",
      meetings: "Збори",
    },

    slides: {
      main: {
        eyebrow: "Головна сторінка будинку",
        fallbackDescription:
          "Швидкий доступ до важливих розділів та інформації будинку.",
      },
      life: {
        eyebrow: "Життя будинку",
        title: "Слідкуйте за життям будинку зручно та швидко",
        description:
          "Відкривайте головні розділи за кілька натискань та будьте в курсі важливих подій.",
      },
      all: {
        eyebrow: "Все під рукою",
        title: "Звіти, збори та план робіт завжди поруч",
        description:
          "Головна сторінка допомагає швидко перейти до потрібного розділу та знайти важливу інформацію.",
      },
    },

    navigation: {
      prev: "Попередній слайд",
      next: "Наступний слайд",
      goTo: (i: number) => `Перейти до слайду ${i}`,
    },
  },
} as const;


export const houseSystemCopy = {
  cta: {
    open: "Відкрити розділ",
  },

  date: {
    unknown: "Дата уточнюється",
    locale: "uk-UA",
  },

  currency: {
    locale: "uk-UA",
  },

  freshness: {
    new: "НОВЕ",
  },

  homeDashboard: {
    common: {
      comingSoon: "Розділ скоро з’явиться",
      none: "Немає",
      important: "Важливе",
      announcement: "Оголошення",
      meetingsArchive: "Архів",
      voting: "Голосування",
      review: "Перевірка",
      decision: "Рішення",
      nearestMeeting: "Найближчі збори",
      importantInfo: "Важлива інформація",
      openInfoSection:
        "Відкрийте розділ, щоб переглянути важливу інформацію для мешканців.",
      activeVoting: "Активне голосування",
      activeVotingDescription:
        "Зараз відкрите активне голосування для мешканців.",
      paymentStatus: "Стан оплат",
    },

    hero: {
      headlineFallback: "Усе важливе про будинок — в одному кабінеті",
      subheadlineFallback:
        "Швидкий доступ до головних розділів та важливої інформації будинку.",
    },

    announcements: {
      title: "Оголошення",
      placeholderDescription:
        "Оголошення будинку скоро будуть доступні на головній сторінці.",
      warning: "Звернути увагу",
      normal: "Звичайне",
      fallbackDescription:
        "Останні оголошення та важливі повідомлення для мешканців.",
      published: "Опубліковано",
      totalPublished: "Усього опубліковано",
    },

    plan: {
      title: "План робіт",
      placeholderDescription:
        "План робіт скоро з’явиться на головній сторінці.",
      placeholderPublished:
        "План робіт скоро буде опубліковано для мешканців.",
      currentWorks: "Поточні роботи",
      upcomingPlans: "Найближчі плани",
      inProgressSuffix: "у роботі",
      plannedSuffix: "заплановано",
      fallbackDescription:
        "Слідкуйте за актуальним планом робіт по будинку.",
      nearestDate: "Найближча дата",
      updated: "Оновлено",
      tasksInProgress: "Завдань у роботі",
    },

    meetings: {
      title: "Збори",
      placeholderDescription: "Збори ще не опубліковані.",
      meeting: "Збори",
      fallbackDescription:
        "Перегляньте деталі актуальних зборів мешканців.",
      date: "Дата",
      nextMeeting: "Наступні збори",
      status: "Статус",
    },

    debtors: {
      title: "Боржники",
      placeholderDescription: "Інформація про оплати скоро з’явиться.",
      noDebts: "Заборгованостей немає",
      noDebtsDescription:
        "Актуальних заборгованостей за опублікованим списком немає.",
      totalDebt: "Загальна сума заборгованості",
      actualDate: "Дата актуальності",
      debtorOne: "боржник",
      debtorMany: "боржників",
    },

    statusStrip: {
      announcements: "Нових оголошень",
      plan: "Робіт у процесі",
      meetings: "Наступні збори",
      notScheduled: "Поки не призначено",
    },
  },
} as const;


export const houseAnnouncementsCopy = {
  levels: {
    danger: "Важливе",
    warning: "Звернути увагу",
    info: "Звичайне оголошення",
  },

  filters: {
    all: "Усі",
  },

  date: {
    recent: "Нещодавно",
  },

  empty: {
    noText: "Оголошення без тексту.",
  },

  page: {
    title: "Оголошення",
    description:
      "Важливі повідомлення, сервісні оголошення та новини для мешканців.",
    feedTitle: "Стрічка оголошень",
    shown: "Показано",
    pinned: "Закріплено",
    importantFallback: "Важливе оголошення",
  },
} as const;

export const houseInformationCopy = {
  page: {
    title: "Інформація",
    description:
      "Корисні матеріали, відповіді на часті запитання та важлива інформація для мешканців.",
  },

  filters: {
    all: "Усі",
  },

  empty: {
    noMaterials: "Матеріали поки не опубліковані.",
  },

  documents: {
    title: "Матеріали",
    subtitle: "Матеріали для мешканців",
    pdfFallback: "PDF матеріал для ознайомлення",
  },

  faq: {
    title: "Часті запитання",
    questionFallback: "Запитання",
  },

  date: {
    recent: "Нещодавно",
    locale: "uk-UA",
  },
} as const;

export const houseSpecialistsCopy = {
  page: {
    title: "Спеціалісти",
    description:
      "Перевірені спеціалісти та підрядники для вирішення побутових питань у будинку.",
    empty: "Спеціалісти скоро з’являться.",
    closeModal: "Закрити вікно заявки",
  },

  card: {
    primary: "Основний контакт",
    phone: "Телефон",
    phoneHidden: "Телефон приховано",
    hours: "Час зв’язку",
    hoursEmpty: "Час зв’язку не вказано",
    request: "Залишити заявку",
  },

  filters: {
    all: "Усі",
  },

  form: {
    successTitle: "Заявку відправлено",
    successText:
      "Керуюча компанія отримала ваш запит і допоможе передати звернення обраному спеціалісту.",

    name: "Ім’я",
    namePlaceholder: "Ваше ім’я",

    email: "Email",

    phone: "Телефон",

    apartment: "Квартира",
    selectApartment: "Оберіть квартиру",

    comment: "Коментар",
    commentPlaceholder: "Опишіть проблему детальніше",

    send: "Відправити заявку",
    sending: "Відправляємо...",
  },
} as const;

export const houseBoardCopy = {
  page: {
    title: "Правління",
    description: "Контакти правління, відповідальних осіб та представників будинку.",
    intro: "Звернення від правління",
    empty: "Членів правління поки не визначено.",
  },

  filters: {
    all: "Усі",
    chairman: "Голова",
    viceChairman: "Заступник голови",
    member: "Члени правління",
    revisionCommission: "Ревізійна комісія",
  },

  card: {
    roleFallback: "Посада",
    nameFallback: "Ім’я поки не вказано",
    phone: "Телефон",
    email: "Email",
    officeHours: "Час зв’язку",
    description: "Опис",
  },
} as const;

export const houseRequisitesCopy = {
  page: {
    title: "Реквізити",
    description: "Актуальні реквізити та дані для оплати послуг будинку.",
    empty:
      "Актуальні реквізити поки не опубліковані. Після публікації в CMS тут з’являться дані для оплати та копіювання.",
  },

  card: {
    recipient: "Отримувач",
    iban: "IBAN",
    edrpou: "ЄДРПОУ",
    bank: "Банк",

    helperRecipient: "Назва отримувача платежу.",
    helperIban: "Основний рахунок для переказу. Його зручно копіювати першим.",
    helperEdrpou: "Код отримувача платежу.",
    helperBank: "Банк, у якому відкрито рахунок отримувача.",

    empty: "Не заповнено",
    copy: "Скопіювати",
    noData: "Немає даних",
  },

  blocks: {
    purpose: "Призначення платежу",
    example: "Приклад заповнення",

    helperPurpose:
      "Використовуйте це призначення платежу як основу для ручної оплати.",
    helperExample:
      "Приклад показує, як може виглядати заповнене призначення платежу.",
  },

  payment: {
    title: "Додатковий спосіб оплати",
    description:
      "Якщо для будинку підключена онлайн-оплата, ви можете перейти за кнопкою нижче. Інакше використовуйте реквізити вище.",
    buttonFallback: "Перейти до оплати",
    disabled: "Онлайн-оплата поки не підключена",
  },

  toast: {
    copied: "Скопійовано",
    error: "Не вдалося скопіювати",
  },
} as const;

export const houseReportsCopy = {
  page: {
    title: "Звіти",
    description:
      "Звіти про виконані роботи та важливі оновлення будинку в одному місці.",
  },

  tabs: {
    current: "Поточний рік",
    archive: "Архів",
  },

  filters: {
    all: "Усі",
  },

  date: {
    empty: "Без дати",
    locale: "uk-UA",
  },

  months: {
    "01": "Січень",
    "02": "Лютий",
    "03": "Березень",
    "04": "Квітень",
    "05": "Травень",
    "06": "Червень",
    "07": "Липень",
    "08": "Серпень",
    "09": "Вересень",
    "10": "Жовтень",
    "11": "Листопад",
    "12": "Грудень",
  },
} as const;

export const housePlanCopy = {
  page: {
    title: "План робіт",
    description:
      "Слідкуйте за поточними роботами по будинку, строками виконання та вже завершеними задачами.",
  },

  tabs: {
    active: "Активні",
    archive: "Архів",
  },

  active: {
    title: "Поточні роботи",
    description:
      "Тут відображаються всі роботи, які заплановані, виконуються зараз або були нещодавно завершені.",
  },

  columns: {
    planned: "Заплановано",
    inProgress: "В роботі",
    completed: "Виконано",
  },

  archive: {
    locale: "uk-UA",
    title: "Архів виконаних робіт",
    empty: "Архів поки порожній",
  },
} as const;

export const houseMeetingsCopy = {
  page: {
    title: "Збори",
    description:
      "Найближчі збори, голосування та прийняті рішення для мешканців будинку.",
    nearest: "Найближчі збори",
  },

  tabs: {
    scheduled: "Заплановано",
    active: "Голосування",
    review: "На перевірці",
    completed: "Завершено",
    archive: "Архів",
  },

  archive: {
    all: "Усі",
    locale: "uk-UA",
  },

  status: {
    scheduled: "Заплановано",
    active: "Голосування",
    review: "Перевірка",
    completed: "Рішення",
    archived: "Архів",
  },

  votes: {
    for: "За",
    against: "Проти",
    abstained: "Утримались",
  },

  activeNote:
    "Голоси за цим зібранням збираються головою будинку офлайн. Після передачі в керуючу компанію результати з’являться у статусі «На перевірці».",

  voters: {
    voted: "Проголосували",
    empty: "Поки немає внесених голосів.",
    notVoted: "Не проголосували",
    notYet: "Ще не проголосували",
  },

  empty: {
    scheduled: "Зараз запланованих зборів немає",
    active: "Зараз немає активних голосувань",
    review: "Зараз немає зборів на перевірці",
    completed: "Завершених зборів поки немає",
    archive: "В архіві поки немає зборів",

    scheduledDesc:
      "Коли правління призначить нову дату, інформація з’явиться в цьому розділі.",
    activeDesc:
      "Якщо по будинку триває збір рішень, інформація з’явиться тут.",
    reviewDesc:
      "Після передачі голосів результати з’являться в цьому розділі.",
    completedDesc:
      "Після підбиття підсумків тут будуть опубліковані результати зборів.",
    archiveDesc:
      "Коли збори перейдуть в архів, вони будуть доступні тут.",
  },
} as const;
