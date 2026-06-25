"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PublicThemeProvider.tsx
// Блок 0 — per-house тема мешканця (light | dark, світла = default).
//
// • Тримає стан теми та віддає його через React-контекст.
// • Пише атрибут data-house-theme на корінь #pub-theme-root.
// • Зберігає вибір per-house: localStorage["osbb-house-theme-<slug>"].
// • БЕЗ FOUC: початковий атрибут уже виставлено синхронним <PublicThemeScript/>
//   (рендериться першим дочірнім вузлом кореня в layout.tsx), тому провайдер
//   лише «підхоплює» вже застосовану тему — без перефарбовування на гідрації.
// ════════════════════════════════════════════════════════════════════════
import * as React from "react";

export type HouseTheme = "light" | "dark";

const ROOT_ID = "pub-theme-root";
export const houseThemeStorageKey = (slug: string) => `osbb-house-theme-${slug}`;

type PublicThemeContextValue = {
  theme: HouseTheme;
  setTheme: (t: HouseTheme) => void;
  toggleTheme: () => void;
};

const PublicThemeContext = React.createContext<PublicThemeContextValue | null>(null);

function readAppliedTheme(): HouseTheme {
  if (typeof document === "undefined") return "light";
  const el = document.getElementById(ROOT_ID);
  return el?.getAttribute("data-house-theme") === "dark" ? "dark" : "light";
}

export function PublicThemeProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  // Стартуємо від уже застосованої теми (виставленої PublicThemeScript) → 0 миготіння.
  const [theme, setThemeState] = React.useState<HouseTheme>("light");

  React.useEffect(() => {
    setThemeState(readAppliedTheme());
  }, []);

  const setTheme = React.useCallback(
    (next: HouseTheme) => {
      const el = document.getElementById(ROOT_ID);
      if (el) el.setAttribute("data-house-theme", next);
      try {
        window.localStorage.setItem(houseThemeStorageKey(slug), next);
      } catch {
        /* приватний режим / квота — мовчки ігноруємо */
      }
      setThemeState(next);
    },
    [slug],
  );

  const toggleTheme = React.useCallback(() => {
    setTheme(readAppliedTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <PublicThemeContext.Provider value={value}>{children}</PublicThemeContext.Provider>;
}

/** Хук доступу до теми мешканця. Безпечний поза провайдером (повертає no-op). */
export function usePublicTheme(): PublicThemeContextValue {
  const ctx = React.useContext(PublicThemeContext);
  if (ctx) return ctx;
  return {
    theme: "light",
    setTheme: () => {},
    toggleTheme: () => {},
  };
}
