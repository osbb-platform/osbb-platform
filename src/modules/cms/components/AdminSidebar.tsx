"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import { getRoleLabel } from "@/src/shared/constants/roles/roles.constants";
import type { ResolvedRoleAccess } from "@/src/shared/permissions/rbac.types";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type NavigationItem = {
  href: string;
  label: string;
  visible?: boolean;
};

type AdminSidebarProps = {
  currentUser: CurrentAdminUser;
  access: ResolvedRoleAccess;
};

function isItemActive(pathname: string, href: string) {
  if (href === ROUTES.admin.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ currentUser, access }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation: NavigationItem[] = [
    {
      href: ROUTES.admin.dashboard,
      label: "Панель керування",
      visible: access.topLevel.dashboard,
    },
    {
      href: ROUTES.admin.districts,
      label: "Райони",
      visible: access.topLevel.districts,
    },
    {
      href: ROUTES.admin.houses,
      label: "Будинки",
      visible: access.topLevel.houses,
    },
    {
      href: ROUTES.admin.apartments,
      label: "Квартири",
      visible: access.topLevel.apartments,
    },
    {
      href: ROUTES.admin.history,
      label: "Історія",
      visible: access.topLevel.history,
    },
    {
      href: ROUTES.admin.employees,
      label: "Співробітники",
      visible: access.topLevel.employees,
    },
    {
      href: ROUTES.admin.companyPages,
      label: "Сайт компанії",
      visible: access.topLevel.companyPages,
    },
  ];

  const isProfileActive =
    pathname === ROUTES.admin.profile ||
    pathname.startsWith(`${ROUTES.admin.profile}/`);

  return (
    <aside className="w-full border-b border-[var(--cms-border-primary)] bg-[var(--cms-sidebar-bg)] lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-[var(--cms-border-primary)] px-6 py-6">
          <h2 className="mt-4 text-xl font-semibold text-[var(--cms-text-primary)]">
            OSBB Platform
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--cms-text-secondary)]">
            Панель керування керуючої компанії
          </p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {navigation
              .filter((item) => item.visible !== false)
              .map((item) => {
                const isActive = isItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "border border-amber-500/40 bg-[rgba(217,119,6,0.12)] text-white shadow-[inset_0_1px_0_rgba(251,191,36,0.18)]"
                        : "text-[var(--cms-text-secondary)] hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text-primary)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[var(--cms-border-primary)] px-4 py-4">
          <Link
            href={ROUTES.admin.profile}
            aria-current={isProfileActive ? "page" : undefined}
            className={`block rounded-3xl border p-5 transition-all duration-200 ${
              isProfileActive
                ? "border-[var(--cms-border-secondary)] bg-[var(--cms-sidebar-card)] shadow-[0_1px_0_rgba(255,255,255,0.55)]"
                : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] hover:bg-[var(--cms-sidebar-hover)]"
            }`}
          >
            <div className="mt-3 text-sm font-medium text-[var(--cms-text-primary)]">
              {currentUser.fullName ?? currentUser.email ?? "Не вказано"}
            </div>

            <div className="mt-1 text-sm text-[var(--cms-text-secondary)]">
              {currentUser.email ?? "Електронну пошту не вказано"}
            </div>

            <div className="mt-3 inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-secondary)]">
              {getRoleLabel(currentUser.role)}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
