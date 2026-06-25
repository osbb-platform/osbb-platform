// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PublicIcons.tsx
// Набір лінійних іконок публічки на currentColor (тема-агностичні).
// stroke-width 1.9, round caps — у мові DS адмінки. Колір успадковується.
// Використання: <PubIcon name="bell" className="h-5 w-5 text-[var(--pub-text-muted)]" />
// ════════════════════════════════════════════════════════════════════════
import type { SVGProps } from "react";

export type PubIconName =
  | "home"
  | "megaphone"
  | "doc"
  | "calendar"
  | "wrench"
  | "coin"
  | "users"
  | "bank"
  | "bell"
  | "info"
  | "check"
  | "phone"
  | "copy"
  | "download"
  | "search"
  | "alert"
  | "chevron-right"
  | "chevron-down"
  | "close"
  | "sun"
  | "moon"
  | "menu";

const PATHS: Record<PubIconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M6 10v9h12v-9"/><path d="M9.5 13.5h2M12.5 13.5h2"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 8a4 4 0 0 1 0 8"/>',
  doc: '<path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M9 3v4M15 3v4"/>',
  wrench: '<path d="M14 6a3.5 3.5 0 0 1-4.6 4.6L5 15l4 4 4.4-4.4A3.5 3.5 0 0 1 18 10"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5h3a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h3"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>',
  bank: '<path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18M9 21v-6h6v6"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="M5 12l4 4 10-10"/>',
  phone: '<path d="M5 4h3l1.5 5L7 11a12 12 0 0 0 6 6l2-2.5 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  download: '<path d="M12 5v10M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  "chevron-right": '<path d="M9 6l6 6-6 6"/>',
  "chevron-down": '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};

export type PubIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: PubIconName;
};

export function PubIcon({ name, className = "h-5 w-5", ...rest }: PubIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
      {...rest}
    />
  );
}
