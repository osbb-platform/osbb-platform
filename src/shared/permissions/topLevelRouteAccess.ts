import { ROUTES } from "@/src/shared/config/routes/routes.config";
import type { CmsTopLevelSectionKey } from "@/src/shared/permissions/rbac.types";

export const TOP_LEVEL_ROUTE_ACCESS: Array<{
  href: string;
  section: CmsTopLevelSectionKey;
}> = [
  { href: ROUTES.admin.dashboard, section: "dashboard" },
  { href: ROUTES.admin.districts, section: "districts" },
  { href: ROUTES.admin.houses, section: "houses" },
  { href: ROUTES.admin.apartments, section: "apartments" },
  { href: ROUTES.admin.tasks, section: "tasks" },
  { href: ROUTES.admin.history, section: "history" },
  { href: ROUTES.admin.employees, section: "employees" },
  { href: ROUTES.admin.companyPages, section: "companyPages" },
  { href: ROUTES.admin.profile, section: "profile" },
];
