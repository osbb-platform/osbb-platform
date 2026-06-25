"use client";

import type { ReactNode } from "react";
import {
  type HouseTheme,
  usePublicTheme,
} from "@/src/shared/ui/public/PublicThemeProvider";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.6A8.5 8.5 0 1 1 11.4 3 6.5 6.5 0 0 0 21 12.6Z" />
    </svg>
  );
}

type ThemeOptionProps = {
  value: HouseTheme;
  label: string;
  icon: ReactNode;
  activeTheme: HouseTheme;
  onChange: (value: HouseTheme) => void;
};

function ThemeOption({
  value,
  label,
  icon,
  activeTheme,
  onChange,
}: ThemeOptionProps) {
  const isActive = activeTheme === value;

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={isActive}
      className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--r-pill)] px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)] ${
        isActive
          ? "bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]"
          : "text-[var(--pub-text-muted)] hover:bg-[var(--pub-accent-tint)] hover:text-[var(--pub-text)]"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function PublicThemeSwitch() {
  const { theme, setTheme } = usePublicTheme();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-1 shadow-[var(--pub-shadow-sm)]"
      aria-label="Перемикач теми"
    >
      <ThemeOption
        value="light"
        label="Світла тема"
        icon={<SunIcon />}
        activeTheme={theme}
        onChange={setTheme}
      />
      <ThemeOption
        value="dark"
        label="Темна тема"
        icon={<MoonIcon />}
        activeTheme={theme}
        onChange={setTheme}
      />
    </div>
  );
}
