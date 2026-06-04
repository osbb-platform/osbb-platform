"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CurrentAdminUser } from "@/src/shared/types/entities/admin.types";
import { getRoleLabel } from "@/src/shared/constants/roles/roles.constants";
import type { ResolvedRoleAccess } from "@/src/shared/permissions/rbac.types";
import { ROUTES } from "@/src/shared/config/routes/routes.config";
import type { ComponentType, SVGProps } from "react";
import {
  AnalyticsIcon,
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
  badgeLabel?: string;
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return localStorage.getItem("osbb-admin-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const next = !current;

      try {
        localStorage.setItem("osbb-admin-sidebar-collapsed", String(next));
      } catch {
        // Ignore storage errors.
      }

      return next;
    });
  }

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
      href: ROUTES.admin.analytics,
      label: "Аналітика",
      icon: AnalyticsIcon,
      visible: access.topLevel.analytics,
      badgeLabel: "NEW",
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
    <aside
      className={`w-full border-b border-[var(--cms-border-primary)] bg-[var(--cms-sidebar-bg)] transition-[width] duration-300 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r ${
        isCollapsed ? "lg:w-24" : "lg:w-72"
      }`}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`shrink-0 border-b border-[var(--cms-border-primary)] py-5 ${
            isCollapsed ? "px-3" : "px-6"
          }`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-sidebar-card)] text-sm font-black tracking-tight text-[var(--cms-text)]"
                aria-label="OSBB Platform"
                title="OSBB Platform"
              >
                OS
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text)]"
                aria-label="Розгорнути бокову панель"
                title="Розгорнути панель"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[var(--cms-text)]">
                  OSBB Platform
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--cms-text-muted)]">
                  Панель керування керуючої компанії
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] text-[var(--cms-text-muted)] transition hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text)] lg:inline-flex"
                aria-label="Згорнути бокову панель"
                title="Згорнути панель"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <nav className={`min-h-0 flex-1 overflow-y-auto py-4 ${isCollapsed ? "px-3" : "px-4"}`}>
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
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-2xl text-sm font-medium transition-all duration-200 ${
                      isCollapsed ? "justify-center px-3 py-3" : "justify-between gap-3 px-4 py-3"
                    } ${
                      isActive
                        ? "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                        : "text-[var(--cms-text-muted)] hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text)]"
                    }`}
                  >
                    <div className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                      <Icon className="h-5 w-5 shrink-0" />
                      {isCollapsed ? (
                        <span className="sr-only">{item.label}</span>
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badgeLabel ? (
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                          isActive
                            ? "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
                            : "border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-[var(--cms-text)]"
                        }`}
                      >
                        {item.badgeLabel}
                      </span>
                    ) : !isCollapsed && typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
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

        <div className={`shrink-0 border-t border-[var(--cms-border-primary)] py-4 ${isCollapsed ? "px-3" : "px-4"}`}>
          <Link
            href={ROUTES.admin.profile}
            aria-current={isProfileActive ? "page" : undefined}
            title={isCollapsed ? currentUser.fullName ?? currentUser.email ?? "Профіль" : undefined}
            className={`block rounded-3xl border transition-all duration-200 ${
              isCollapsed ? "p-3 text-center" : "p-4"
            } ${
              isProfileActive
                ? "border-[var(--cms-border-secondary)] bg-[var(--cms-sidebar-card)] shadow-[inset_0_1px_0_var(--cms-border-secondary)]"
                : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] hover:bg-[var(--cms-sidebar-hover)]"
            }`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] text-sm font-bold uppercase text-[var(--cms-text)]">
                {(currentUser.fullName ?? currentUser.email ?? "U").slice(0, 1)}
              </div>

              {isCollapsed ? null : (
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--cms-text)]">
                    {currentUser.fullName ?? currentUser.email ?? "Не вказано"}
                  </div>

                  <div className="mt-0.5 truncate text-xs text-[var(--cms-text-muted)]">
                    {currentUser.email ?? "Електронну пошту не вказано"}
                  </div>
                </div>
              )}
            </div>

            {isCollapsed ? (
              <div className="mt-2 truncate text-[10px] font-medium text-[var(--cms-text-muted)]">
                {getRoleLabel(currentUser.role)}
              </div>
            ) : (
              <div className="mt-3 inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--cms-text-muted)]">
                {getRoleLabel(currentUser.role)}
              </div>
            )}
          </Link>
        </div>
      </div>
    </aside>
  );
}
