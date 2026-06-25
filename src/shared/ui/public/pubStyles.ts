// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/pubStyles.ts
// Спільні токен-класи публічного UI (паблик-аналог adminStyles.ts).
// Усе — лише через var(--pub-*) / --r-*. Жодних hex / slate-* / rgba(...).
// ════════════════════════════════════════════════════════════════════════

/** Конкатенація класів з відсіюванням порожніх значень. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Видимий focus-ring у кольорі району (через box-shadow, без ring-config). */
export const PUB_FOCUS_RING =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]";

/** Поверхні. */
export const pubSurface =
  "bg-[var(--pub-surface)] border border-[var(--pub-border)]";
export const pubSurfaceElevated =
  "bg-[var(--pub-surface-elevated)] border border-[var(--pub-border)]";
export const pubQuiet = "bg-[var(--pub-bg-quiet)] border border-[var(--pub-border)]";

/** Тіні. */
export const pubShadow = {
  sm: "shadow-[var(--pub-shadow-sm)]",
  md: "shadow-[var(--pub-shadow-md)]",
  lg: "shadow-[var(--pub-shadow-lg)]",
} as const;

/** Текст. */
export const pubText = {
  base: "text-[var(--pub-text)]",
  muted: "text-[var(--pub-text-muted)]",
  soft: "text-[var(--pub-text-soft)]",
};

/** Eyebrow-мітка (UPPERCASE, tracking). */
export const pubEyebrow =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]";

/** Serif-display заголовок (Lora). */
export const pubDisplay =
  "font-[var(--font-serif)] font-semibold tracking-[-0.01em] text-[var(--pub-text)]";

/** Семантичні тони — мапа для бейджів/станів. */
export type PubTone =
  | "accent"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";

export const pubToneClass: Record<PubTone, string> = {
  accent:
    "bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)] border-[var(--pub-accent-border)]",
  success:
    "bg-[var(--pub-success-bg)] text-[var(--pub-success-text)] border-[var(--pub-success-border)]",
  danger:
    "bg-[var(--pub-danger-bg)] text-[var(--pub-danger-text)] border-[var(--pub-danger-border)]",
  warning:
    "bg-[var(--pub-warning-bg)] text-[var(--pub-warning-text)] border-[var(--pub-warning-border)]",
  info: "bg-[var(--pub-info-bg)] text-[var(--pub-info-text)] border-[var(--pub-info-border)]",
  neutral:
    "bg-[var(--pub-bg-quiet)] text-[var(--pub-text-muted)] border-[var(--pub-border)]",
};

/** Колір лівої акцент-смужки картки за тоном (несе семантику розділу). */
export const pubAccentStripColor: Record<PubTone, string> = {
  accent: "bg-[var(--pub-accent)]",
  success: "bg-[var(--pub-success-text)]",
  danger: "bg-[var(--pub-danger-text)]",
  warning: "bg-[var(--pub-warning-text)]",
  info: "bg-[var(--pub-info-text)]",
  neutral: "bg-[var(--pub-border-strong)]",
};
