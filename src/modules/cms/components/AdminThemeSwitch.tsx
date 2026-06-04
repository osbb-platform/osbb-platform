"use client";

import { useSyncExternalStore } from "react";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type AdminTheme = "dark" | "light";

const STORAGE_KEY = "osbb-admin-theme";
const THEME_CHANGE_EVENT = "osbb-admin-theme-change";

function applyTheme(theme: AdminTheme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-admin-theme", "light");
    document.documentElement.style.colorScheme = "light";
  } else {
    document.documentElement.removeAttribute("data-admin-theme");
    document.documentElement.style.colorScheme = "dark";
  }
}

function readStoredTheme(): AdminTheme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function subscribeTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  };
}

function getThemeSnapshot(): AdminTheme {
  return readStoredTheme();
}

function getThemeServerSnapshot(): AdminTheme {
  return "light";
}

function persistTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  } catch {
    applyTheme(theme);
  }
}

export function AdminThemeSwitch() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  function handleThemeChange(nextTheme: AdminTheme) {
    persistTheme(nextTheme);
  }

  const lightButtonClass =
    theme === "light"
      ? adminPrimaryButtonClass
      : adminSecondaryButtonClass;

  const darkButtonClass =
    theme === "dark"
      ? adminPrimaryButtonClass
      : adminSecondaryButtonClass;

  return (
    <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5 md:col-span-2">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-[var(--cms-text)]">
          Налаштування теми
        </h3>

        <p className="mt-2 text-sm text-[var(--cms-text-muted)]">
          Оберіть режим відображення робочої зони платформи.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleThemeChange("light")}
          className={lightButtonClass}
        >
          Світла
        </button>

        <button
          type="button"
          onClick={() => handleThemeChange("dark")}
          className={darkButtonClass}
        >
          Темна
        </button>
      </div>
    </div>
  );
}
