// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubSectionHeader.tsx
// Єдина «шапка розділу» кабінету (Блок 07): serif-display заголовок +
// опис + слот під таби/тулбар. Server-safe (без "use client").
// ════════════════════════════════════════════════════════════════════════
import type { ReactNode } from "react";
import { cx } from "./pubStyles";

export type PubSectionHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  /** Контент під описом — зазвичай <PubFilterTabs/> або тулбар. */
  children?: ReactNode;
  className?: string;
};

export function PubSectionHeader({
  title,
  description,
  eyebrow,
  children,
  className,
}: PubSectionHeaderProps) {
  return (
    <section
      className={cx(
        "w-full min-w-0 rounded-[var(--r-3xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-sm)] sm:p-8 lg:p-10",
        className,
      )}
    >
      <div className="min-w-0 text-center">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-[var(--font-serif)] text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.01em] text-[var(--pub-text)]">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[var(--pub-text-muted)] sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
