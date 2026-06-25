// ════════════════════════════════════════════════════════════════════════
// src/modules/houses/utils/resolveDistrictAccent.ts
// Блок 0 — джерело акценту = колір району (district.theme_color).
//
// НЕ змінює джерело кольору. Лише обчислює:
//   • читабельний контраст тексту на акценті (WCAG relative luminance),
//   • готовий inline-style об'єкт із --pub-accent / --pub-accent-contrast
//     для кореня .pub-theme-root.
// SSR-safe (чиста функція, без window/DOM).
// ════════════════════════════════════════════════════════════════════════
import type { CSSProperties } from "react";

/** Дефолт-район, коли color відсутній (= як у поточній публічці). */
export const DEFAULT_DISTRICT_ACCENT = "#16a34a";

export type ReadableForeground = "#ffffff" | "#1A1610";

/** Нормалізує hex (#rgb | #rrggbb, з/без #) у #rrggbb; інакше null. */
function normalizeHex(input?: string | null): string | null {
  if (!input) return null;
  const m = input.trim().replace(/^#/, "");
  const hex = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toLowerCase()}` : null;
}

/**
 * Повертає темний або білий текст для читабельності НА кольорі району.
 * Жовтий/світлий район → темний текст; темно-зелений/насичений → білий.
 */
export function getReadableForeground(hex: string): ReadableForeground {
  const norm = normalizeHex(hex) ?? DEFAULT_DISTRICT_ACCENT;
  const v = norm.slice(1);
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Обираємо колір тексту за РЕАЛЬНИМ контрастним коефіцієнтом WCAG (а не половиною шкали):
  // contrast(black) = (L+0.05)/0.05 ; contrast(white) = 1.05/(L+0.05).
  // Точка перетину ≈ L 0.179 — нижче неї виграє білий, вище — темний.
  // Це критично для «жовтих/янтарних» районів: на світлому акценті текст стає темним і читабельним.
  const contrastBlack = (L + 0.05) / 0.05;
  const contrastWhite = 1.05 / (L + 0.05);
  return contrastBlack >= contrastWhite ? "#1A1610" : "#ffffff";
}

/**
 * Inline-style для кореня .pub-theme-root.
 * Використання у layout.tsx:
 *   <div className="pub-theme-root" style={getDistrictAccentStyle(districtColor)} ...>
 */
export function getDistrictAccentStyle(color?: string | null): CSSProperties {
  const accent = normalizeHex(color) ?? DEFAULT_DISTRICT_ACCENT;
  return {
    ["--pub-accent" as string]: accent,
    ["--pub-accent-contrast" as string]: getReadableForeground(accent),
  } as CSSProperties;
}
