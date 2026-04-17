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
      label: "Dashboard",
      visible: access.topLevel.dashboard,
    },
    {
      href: ROUTES.admin.districts,
      label: "Районы",
      visible: access.topLevel.districts,
    },
    {
      href: ROUTES.admin.houses,
      label: "Дома",
      visible: access.topLevel.houses,
    },
    {
      href: ROUTES.admin.apartments,
      label: "Квартиры",
      visible: access.topLevel.apartments,
    },
    {
      href: ROUTES.admin.history,
      label: "История",
      visible: access.topLevel.history,
    },
    {
      href: ROUTES.admin.employees,
      label: "Сотрудники",
      visible: access.topLevel.employees,
    },
    {
      href: ROUTES.admin.companyPages,
      label: "Сайт компании",
      visible: access.topLevel.companyPages,
    },
  ];

  const isProfileActive =
    pathname === ROUTES.admin.profile ||
    pathname.startsWith(`${ROUTES.admin.profile}/`);

  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-slate-800 px-6 py-6">
          <h2 className="mt-4 text-xl font-semibold text-white">
            OSBB Platform
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Панель управления управляющей компании
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
                    className={`flex rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "border border-slate-700 bg-slate-900 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                        : "text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-800 px-4 py-4">
          <Link
            href={ROUTES.admin.profile}
            aria-current={isProfileActive ? "page" : undefined}
            className={`block rounded-2xl border p-4 transition ${
              isProfileActive
                ? "border-slate-700 bg-slate-900"
                : "border-slate-800 bg-slate-900/70 hover:bg-slate-900"
            }`}
          >
            <div className="mt-3 text-sm font-medium text-white">
              {currentUser.fullName ?? currentUser.email ?? "Не указан"}
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {currentUser.email ?? "Email не указан"}
            </div>

            <div className="mt-3 inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
              {getRoleLabel(currentUser.role)}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
