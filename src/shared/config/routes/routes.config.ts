export const ROUTES = {
  public: {
    home: "/",
    house: (slug: string) => `/house/${slug}`,
  },
  admin: {
    root: "/admin",
    dashboard: "/admin",
    login: "/admin/login",
    houses: "/admin/houses",
    apartments: "/admin/apartments",
    districts: "/admin/districts",
    history: "/admin/history",
    companyPages: "/admin/company-pages",
    employees: "/admin/employees",
    profile: "/admin/profile",
    completeRegistration: "/admin/complete-registration",
    forgotPassword: "/admin/forgot-password",
    resetPassword: "/admin/reset-password",
  },
} as const;
