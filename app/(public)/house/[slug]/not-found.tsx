// ════════════════════════════════════════════════════════════════════════
// app/(public)/house/[slug]/not-found.tsx
// Блок 1 · Заглушка «дому немає» (Тип 1, HTTP 404).
//
// Тригер (НЕ чіпати): layout.tsx робить getHouseBySlug(slug); якщо null →
// notFound() → рендериться цей файл БЕЗ chrome кабінету.
//
// Платформений рівень: дому/району немає → акцент нейтральний брендовий.
// Екран самодостатній — сам обгортає вміст у .pub-theme-root і задає акцент.
// Тільки токени --pub-* і примітиви @/src/shared/ui/public.
// ════════════════════════════════════════════════════════════════════════
"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubCard } from "@/src/shared/ui/public/PubCard";

// Нейтральний бренд-акцент замість кольору району (дефолт системи).
const PLATFORM_ACCENT = "#16a34a";

const platformThemeStyle = {
  ["--pub-accent" as string]: PLATFORM_ACCENT,
  ["--pub-accent-contrast" as string]: "#ffffff",
} as CSSProperties;

export default function PublicHouseNotFound() {
  return (
    <div
      className="pub-theme-root flex min-h-[100dvh] items-center justify-center bg-[var(--pub-bg)] px-4 py-10 text-[var(--pub-text)]"
      data-house-theme="light"
      style={platformThemeStyle}
    >
      <PubCard
        elevated
        elevation="lg"
        padding="lg"
        className="w-full max-w-[560px] rounded-[var(--r-3xl)] text-center"
      >
        {/* Бренд-знак «О» у кружку нейтрального акценту */}
        <div className="flex justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] font-[var(--font-serif)] text-[28px] font-semibold leading-none text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]">
            О
          </span>
        </div>

        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)]">
          OSBB Platform
        </div>

        <h1 className="mt-3 font-[var(--font-serif)] text-[32px] font-semibold leading-[1.1] tracking-[-0.01em] text-[var(--pub-text)] sm:text-[40px]">
          Кабінет не знайдено
        </h1>

        <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-7 text-[var(--pub-text-muted)] sm:text-base">
          Можливо, у посиланні помилка, або цей будинок ще не підключено.{" "}
          <span className="font-semibold text-[var(--pub-text)]">
            Зверніться до голови вашого ОСББ
          </span>{" "}
          — він підкаже точну адресу вашого кабінету.
        </p>

        {/* Єдина дія — на головний домен. Контакт УК НЕ показуємо. */}
        <div className="mt-8 flex justify-center">
          <Link prefetch={false} href="https://osbb-platform.com.ua">
            <PubButton variant="primary" size="lg">
              На головну OSBB Platform
            </PubButton>
          </Link>
        </div>

        <p className="mx-auto mt-7 max-w-[420px] text-[13px] leading-relaxed text-[var(--pub-text-soft)]">
          Це звичайна сторінка-підказка, а не збій платформи. Сервіс працює —
          лише за цією адресою кабінету поки немає.
        </p>
      </PubCard>
    </div>
  );
}
