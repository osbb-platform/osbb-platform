// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubFilterTabs.tsx
// Ряд фільтр-табів кабінету (Блоки 06/07). Кожен таб — <Link> (server-safe).
// Активний = акцент району (через --pub-accent*), НЕ хардкод districtColor.
// ════════════════════════════════════════════════════════════════════════
import Link from "next/link";
import { cx } from "./pubStyles";

export type PubFilterTabItem = {
  key: string;
  href: string;
  label: string;
  count?: number;
  active: boolean;
};

export type PubFilterTabsProps = {
  items: PubFilterTabItem[];
  ariaLabel?: string;
  /** Обгортка-«рейка» навколо табів (як у нинішніх розділах). */
  framed?: boolean;
  className?: string;
};

export function PubFilterTabs({
  items,
  ariaLabel,
  framed = true,
  className,
}: PubFilterTabsProps) {
  const row = (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex w-full min-w-0 justify-center gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {items.map((item) => (
        <Link
          prefetch={false}
          key={item.key}
          href={item.href}
          role="tab"
          aria-selected={item.active}
          className={cx(
            "inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--r-pill)] px-4 text-sm font-semibold transition",
            item.active
              ? "border-2 border-[var(--pub-accent)] bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)]"
              : "border border-[var(--pub-border-strong)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] hover:bg-[var(--pub-accent-tint)] hover:text-[var(--pub-text)]",
          )}
        >
          <span>{item.label}</span>
          {typeof item.count === "number" ? (
            <span
              className={cx(
                "inline-flex min-w-[22px] items-center justify-center rounded-[var(--r-pill)] px-2 py-0.5 text-xs font-semibold",
                item.active
                  ? "bg-[color-mix(in_srgb,var(--pub-accent)_18%,transparent)] text-[var(--pub-accent-strong)]"
                  : "bg-[var(--pub-bg-quiet)] text-[var(--pub-text-soft)]",
              )}
            >
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );

  if (!framed) return <div className={className}>{row}</div>;

  return (
    <div
      className={cx(
        "w-full min-w-0 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-2.5",
        className,
      )}
    >
      {row}
    </div>
  );
}
