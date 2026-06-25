"use client";
// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PublicThemeSwitch.tsx
// Блок 0 — перемикач теми мешканця (sun / moon), на токенах --pub-*.
//
// Розміщення: у шапці дровера PublicHouseSidePanel (Блок 3) і, опційно,
// дубль у хедері кабінету на десктопі (Блок 1).
// Іконки — інлайн SVG на currentColor (stroke 2.1, як у DS), без залежностей.
// Механізм теми живе у PublicThemeProvider — тут лише вид + виклик setTheme.
// ════════════════════════════════════════════════════════════════════════
import * as React from "react";
import { usePublicTheme, type HouseTheme } from "./PublicThemeProvider";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

function SunIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

const SEG =
  "flex h-9 w-9 items-center justify-center rounded-[var(--r-pill)] transition-colors " +
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]";
const ACTIVE =
  "bg-[var(--pub-surface-elevated)] text-[var(--pub-text)] shadow-[var(--pub-shadow-sm)]";
const INACTIVE = "text-[var(--pub-text-soft)] hover:text-[var(--pub-text)]";

export function PublicThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = usePublicTheme();

  const Option = ({ value, label, icon }: { value: HouseTheme; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      role="radio"
      aria-checked={theme === value}
      aria-label={label}
      title={label}
      onClick={() => setTheme(value)}
      className={cx(SEG, theme === value ? ACTIVE : INACTIVE)}
    >
      {icon}
    </button>
  );

  return (
    <div
      role="radiogroup"
      aria-label="Тема кабінету"
      className={cx(
        "inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-1",
        className,
      )}
    >
      <Option value="light" label="Світла тема" icon={<SunIcon />} />
      <Option value="dark" label="Темна тема" icon={<MoonIcon />} />
    </div>
  );
}
