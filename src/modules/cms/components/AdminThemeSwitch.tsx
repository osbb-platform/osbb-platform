"use client";

import { useEffect, useRef, useState } from "react";

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
  const [theme, setTheme] = useState<AdminTheme>(() => getStoredTheme());
  const [isSwitching, setIsSwitching] = useState(false);
  const switchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    applyTheme(theme);

    return () => {
      if (switchTimeoutRef.current) {
        window.clearTimeout(switchTimeoutRef.current);
      }
    };
  }, [theme]);

  function handleToggle() {
    const nextTheme: AdminTheme = theme === "dark" ? "light" : "dark";

    setIsSwitching(true);
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);

    if (switchTimeoutRef.current) {
      window.clearTimeout(switchTimeoutRef.current);
    }

    switchTimeoutRef.current = window.setTimeout(() => {
      setIsSwitching(false);
    }, 350);
  }

  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-[var(--cms-text-muted)]">
        Тема
      </div>

      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-9 w-[72px] items-center rounded-full border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] transition"
      >
        <span
          className={`absolute text-xs font-medium transition ${
            isLight
              ? "left-3 text-[var(--cms-text-muted)]"
              : "right-3 text-[var(--cms-text-muted)]"
          }`}
        >
          {isLight ? "Світла" : "Темна"}
        </span>

        <span
          className={`absolute h-7 w-7 rounded-full transition ${
            isLight
              ? "left-[38px] bg-[var(--cms-primary)]"
              : "left-[4px] bg-[var(--cms-text)]"
          }`}
        />

        {isSwitching && (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[var(--cms-text-muted)]">
            Меняем тему...
          </span>
        )}
      </button>
    </div>
  );
}
