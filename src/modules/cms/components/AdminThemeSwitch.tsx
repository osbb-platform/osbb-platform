"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/src/shared/ui/admin/Button";
import { Card } from "@/src/shared/ui/admin/Card";

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

  return (
    <Card
      title="Налаштування теми"
      className="md:col-span-2"
      bodyClassName="space-y-5"
    >
      <p className="max-w-2xl text-sm leading-6 text-[var(--cms-text-muted)]">
        Оберіть режим відображення робочої зони платформи. Механізм теми зберігається у localStorage та застосовується через data-admin-theme.
      </p>

      <div className="inline-flex rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-1.5">
        <Button
          type="button"
          variant={theme === "light" ? "primary" : "ghost"}
          onClick={() => handleThemeChange("light")}
        >
          Світла
        </Button>

        <Button
          type="button"
          variant={theme === "dark" ? "primary" : "ghost"}
          onClick={() => handleThemeChange("dark")}
        >
          Темна
        </Button>
      </div>
    </Card>
  );
}
