"use client";

import { useEffect, useState } from "react";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/src/shared/ui/admin/adminStyles";

type AdminTheme = "dark" | "light";

const STORAGE_KEY = "osbb-admin-theme";

function applyTheme(theme: AdminTheme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-admin-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-admin-theme");
  }
}

function getStoredTheme(): AdminTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" ? "light" : "dark";
}

export function AdminThemeSwitch() {
  const [theme, setTheme] = useState<AdminTheme>("dark");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedTheme = getStoredTheme();
    setTheme(storedTheme);
    applyTheme(storedTheme);
    setIsMounted(true);
  }, []);

  function handleThemeChange(nextTheme: AdminTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  const lightButtonClass =
    isMounted && theme === "light"
      ? adminPrimaryButtonClass
      : adminSecondaryButtonClass;

  const darkButtonClass =
    isMounted && theme === "dark"
      ? adminPrimaryButtonClass
      : adminSecondaryButtonClass;

  return (
    <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-5 md:col-span-2">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-[var(--cms-text-primary)]">
          Налаштування теми
        </h3>

        <p className="mt-2 text-sm text-[var(--cms-text-secondary)]">
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
