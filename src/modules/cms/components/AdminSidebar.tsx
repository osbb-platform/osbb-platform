"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
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


const SIDEBAR_COLLAPSED_STORAGE_KEY = "osbb-admin-sidebar-collapsed";

function subscribeSidebarCollapse(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("osbb-admin-sidebar-collapse-change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("osbb-admin-sidebar-collapse-change", listener);
  };
}

function getSidebarCollapseSnapshot() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getSidebarCollapseServerSnapshot() {
  return false;
}

function setSidebarCollapseValue(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(value));
    window.dispatchEvent(new Event("osbb-admin-sidebar-collapse-change"));
  } catch {
    // Ignore storage errors.
  }
}

function isItemActive(pathname: string, href: string) {
  if (href === ROUTES.admin.dashboard) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}


function getProfileInitials(currentUser: CurrentAdminUser) {
  const source = currentUser.fullName?.trim() || currentUser.email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.slice(0, 1) ?? ""}${parts[1]?.slice(0, 1) ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AdminSidebar({
  currentUser,
  access,
  activeTasksCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const isCollapsed = useSyncExternalStore(
    subscribeSidebarCollapse,
    getSidebarCollapseSnapshot,
    getSidebarCollapseServerSnapshot,
  );

  function toggleSidebar() {
    setSidebarCollapseValue(!isCollapsed);
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
      className={`relative w-full border-b border-[var(--cms-border)] bg-[var(--cms-sidebar-bg)] shadow-[var(--cms-shadow-md)] transition-[width] duration-300 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r ${
        isCollapsed ? "lg:w-24" : "lg:w-72"
      }`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute right-0 top-7 z-20 hidden h-9 w-9 translate-x-1/2 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-sidebar-card)] text-[var(--cms-text-muted)] shadow-[var(--cms-shadow-sm)] transition hover:bg-[var(--cms-sidebar-hover)] hover:text-[var(--cms-text)] lg:inline-flex"
        aria-label={isCollapsed ? "Розгорнути бокову панель" : "Згорнути бокову панель"}
        title={isCollapsed ? "Розгорнути панель" : "Згорнути панель"}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`shrink-0 border-b border-[var(--cms-border)] py-5 ${
            isCollapsed ? "px-3" : "px-6"
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-sidebar-card)] text-[var(--cms-accent-primary)] shadow-[var(--cms-shadow-sm)]"
              aria-label="OSBB Platform"
              title="OSBB Platform"
            >
              <BuildingIcon className="h-6 w-6" />
            </div>

            {isCollapsed ? null : (
              <h2 className="min-w-0 truncate text-xl font-semibold text-[var(--cms-text)]">
                OSBB Platform
              </h2>
            )}
          </div>
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
                    className={`flex items-center rounded-[var(--r-lg)] text-sm font-medium transition-all duration-200 ${
                      isCollapsed ? "justify-center px-3 py-3" : "justify-between gap-3 px-4 py-3"
                    } ${
                      isActive
                        ? "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-text)] shadow-[inset_0_1px_0_var(--cms-border-strong)]"
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
                        className={`inline-flex items-center justify-center rounded-[var(--r-pill)] px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                          isActive
                            ? "border border-[var(--cms-accent-primary)] bg-[var(--cms-accent-primary)] text-[var(--cms-accent-foreground)]"
                            : "border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-[var(--cms-text)]"
                        }`}
                      >
                        {item.badgeLabel}
                      </span>
                    ) : !isCollapsed && typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "border border-[var(--cms-accent-primary)] bg-[var(--cms-accent-primary)] text-[var(--cms-accent-foreground)]"
                            : "border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-[var(--cms-text)]"
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

        <div className={`shrink-0 border-t border-[var(--cms-border)] py-4 ${isCollapsed ? "px-3" : "px-4"}`}>
          <Link
            href={ROUTES.admin.profile}
            aria-current={isProfileActive ? "page" : undefined}
            title={isCollapsed ? currentUser.fullName ?? currentUser.email ?? "Профіль" : undefined}
            className={`block rounded-[var(--r-xl)] border transition-all duration-200 ${
              isCollapsed ? "p-3 text-center" : "p-4"
            } ${
              isProfileActive
                ? "border-[var(--cms-border-strong)] bg-[var(--cms-sidebar-card)] shadow-[inset_0_1px_0_var(--cms-border-strong)]"
                : "border-[var(--cms-border)] bg-[var(--cms-surface)] hover:bg-[var(--cms-sidebar-hover)]"
            }`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] text-sm font-bold uppercase text-[var(--cms-accent-primary)]">
                {getProfileInitials(currentUser)}
              </div>

              {isCollapsed ? null : (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--cms-text)]">
                    {currentUser.fullName ?? currentUser.email ?? "Не вказано"}
                  </div>

                  <div className="mt-0.5 truncate text-xs font-medium text-[var(--cms-text-muted)]">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
