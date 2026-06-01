"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import { getRoleLabel } from "@/src/shared/constants/roles/roles.constants";
import type { ResolvedRoleAccess } from "@/src/shared/permissions/rbac.types";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import type { ComponentType, SVGProps } from "react";
import {
  BuildingIcon,
  CompanySiteIcon,
  DashboardIcon,
  DoorIcon,
  HistoryIcon,
  MapPinIcon,
  TaskListIcon,
  UsersIcon,
} from "@/src/shared/ui/icons/AdminInlineIcons";

type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  visible?: boolean;
  badgeCount?: number;
};

type AdminSidebarProps = {
  currentUser: CurrentAdminUser;
  access: ResolvedRoleAccess;
  activeTasksCount?: number;
};

function isItemActive(pathname: string, href: string) {
  if (href === ROUTES.admin.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  currentUser,
  access,
  activeTasksCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation: NavigationItem[] = [
    {
      href: ROUTES.admin.dashboard,
      label: "Панель керування",
      icon: DashboardIcon,
      visible: access.topLevel.dashboard,
    },
    {
      href: ROUTES.admin.districts,
      label: "Райони",
      icon: MapPinIcon,
      visible: access.topLevel.districts,
    },
    {
      href: ROUTES.admin.houses,
      label: "Будинки",
      icon: BuildingIcon,
      visible: access.topLevel.houses,
    },
    {
      href: ROUTES.admin.apartments,
      label: "Квартири",
      icon: DoorIcon,
      visible: access.topLevel.apartments,
    },
    {
      href: ROUTES.admin.tasks,
      label: "Задачі",
      icon: TaskListIcon,
      visible: access.topLevel.tasks,
      badgeCount: activeTasksCount,
    },
    {
      href: ROUTES.admin.history,
      label: "Історія",
      icon: HistoryIcon,
      visible: access.topLevel.history,
    },
    {
      href: ROUTES.admin.employees,
      label: "Співробітники",
      icon: UsersIcon,
      visible: access.topLevel.employees,
    },
    {
      href: ROUTES.admin.companyPages,
      label: "Сайт компанії",
      icon: CompanySiteIcon,
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
          <h2 className="mt-4 text-xl font-semibold text-[var(--cms-text)]">
            OSBB Platform
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
            Панель керування керуючої компанії
          </p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {navigation
              .filter((item) => item.visible !== false)
              .map((item) => {
                const isActive = isItemActive(pathname, item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                        : "text-[var(--cms-text-muted)] hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text)]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.label}</span>

                    </div>

                    {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                            : "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text)]"
                        }`}
                      >
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </span>
                    ) : null}
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
                ? "border-[var(--cms-border-secondary)] bg-[var(--cms-sidebar-card)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] hover:bg-[var(--cms-sidebar-hover)]"
            }`}
          >
            <div className="mt-3 text-sm font-medium text-[var(--cms-text)]">
              {currentUser.fullName ?? currentUser.email ?? "Не вказано"}
            </div>

            <div className="mt-1 text-sm text-[var(--cms-text-muted)]">
              {currentUser.email ?? "Електронну пошту не вказано"}
            </div>

            <div className="mt-3 inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
              {getRoleLabel(currentUser.role)}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
