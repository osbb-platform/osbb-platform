// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubSkeleton.tsx
// Тепле мерехтіння-плейсхолдер. Анімація вимикається за prefers-reduced-motion
// (правило в public-theme.css гасить усі transition/animation у .pub-theme-root).
// ════════════════════════════════════════════════════════════════════════
import type { CSSProperties } from "react";
import { cx } from "./pubStyles";

export type PubSkeletonProps = {
  variant?: "text" | "block" | "circle";
  /** Кількість рядків для variant="text". */
  lines?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
};

const SHIMMER: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, var(--pub-bg-quiet) 0%, var(--pub-surface-elevated) 50%, var(--pub-bg-quiet) 100%)",
  backgroundSize: "760px 100%",
  animation: "pubShimmer 1.4s infinite linear",
};

export function PubSkeleton({
  variant = "text",
  lines = 3,
  width,
  height,
  className,
}: PubSkeletonProps) {
  if (variant === "text") {
    return (
      <div className={cx("flex flex-col gap-2.5", className)} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 rounded-[var(--r-sm)]"
            style={{ ...SHIMMER, width: i === lines - 1 ? "55%" : i % 2 ? "92%" : "78%" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cx(
        variant === "circle" ? "rounded-full" : "rounded-[var(--r-lg)]",
        className,
      )}
      style={{
        ...SHIMMER,
        width: width ?? (variant === "circle" ? 48 : "100%"),
        height: height ?? (variant === "circle" ? 48 : 64),
      }}
    />
  );
}
