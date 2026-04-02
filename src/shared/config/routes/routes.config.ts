export const ROUTES = {
  public: {
    home: "/",
    house: (slug: string) => `/house/${slug}`,
  },
  admin: {
    root: "/admin",
    login: "/admin/login",
    houses: "/admin/houses",
    company: "/admin/company",
  },
} as const;
