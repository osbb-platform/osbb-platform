"use client";

import type { ReactNode } from "react";
import {
  type HouseTheme,
  usePublicTheme,
} from "@/src/shared/ui/public/PublicThemeProvider";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
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
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
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
      role="radio"
      aria-checked={isActive}
      aria-label={label}
      title={label}
      onClick={() => onChange(value)}
      className={cx(
        "flex h-9 w-9 items-center justify-center rounded-[var(--r-pill)] transition-colors",
        "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]",
        isActive
          ? "bg-[var(--pub-surface-elevated)] text-[var(--pub-text)] shadow-[var(--pub-shadow-sm)]"
          : "text-[var(--pub-text-soft)] hover:text-[var(--pub-text)]",
      )}
    >
      {icon}
    </button>
  );
}

export function PublicThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = usePublicTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Тема кабінету"
      className={cx(
        "inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-1",
        className,
      )}
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
