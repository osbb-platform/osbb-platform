export const ROUTES = {
  public: {
    home: "/",
    // Внутри кабинета дома на {slug}-поддомене пути чистые.
    houseHome: "/",
    houseSection: (section: string) => `/${section}`,
  },
  site: {
    home: "/",
    capabilities: "/mozhlyvosti",
    howItWorks: "/yak-tse-pratsyuye",
    pricing: "/vartist",
    moreThanPlatform: "/bilshe-nizh-platforma",
    demo: "/demo",
    findHouse: "/znayty-budynok",
    residents: "/meshkantsyam",
    kyiv: "/kyiv",
    odesa: "/odesa",
    blog: "/blog",
    blogPost: (slug: string) => `/blog/${slug}`,
    releases: "/onovlennya",
    contacts: "/kontakty",
    privacy: "/polityka-konfidentsiynosti",
  },
  admin: {
    root: "/",
    dashboard: "/",
    login: "/login",
    houses: "/houses",
    apartments: "/apartments",
    tasks: "/tasks",
    analytics: "/analytics",
    cities: "/cities",
    districts: "/districts",
    history: "/history",
    companyPages: "/company-pages",
    employees: "/employees",
    profile: "/profile",
    completeRegistration: "/complete-registration",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
  },
} as const;

/**
 * Внутренние маршруты Next.js по файловой структуре.
 * Использовать только для серверно-внутренних операций вроде revalidatePath().
 * Не использовать для пользовательской навигации: Link, router.push, redirect, form action.
 */
export const INTERNAL_ROUTES = {
  admin: {
    root: "/admin",
    dashboard: "/admin",
    login: "/admin/login",
    houses: "/admin/houses",
    apartments: "/admin/apartments",
    tasks: "/admin/tasks",
    analytics: "/admin/analytics",
    cities: "/admin/cities",
    districts: "/admin/districts",
    history: "/admin/history",
    companyPages: "/admin/company-pages",
    employees: "/admin/employees",
    profile: "/admin/profile",
    completeRegistration: "/admin/complete-registration",
    forgotPassword: "/admin/forgot-password",
    resetPassword: "/admin/reset-password",
  },
  public: {
    house: (slug: string) => `/house/${slug}`,
    houseSection: (slug: string, section: string) => `/house/${slug}/${section}`,
  },
} as const;
