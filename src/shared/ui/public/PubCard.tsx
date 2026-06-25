// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubCard.tsx
// Єдина поверхня-картка публічки. Опційна ліва акцент-смужка несе семантику
// розділу (оголошення → accent, план → warning, звіти → info, тощо).
// ════════════════════════════════════════════════════════════════════════
import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import {
  cx,
  pubAccentStripColor,
  pubShadow,
  type PubTone,
} from "./pubStyles";

export type PubCardProps = HTMLAttributes<HTMLDivElement> & {
  /** Показати ліву акцент-смужку у вказаному тоні. */
  accent?: PubTone;
  elevation?: "none" | "sm" | "md" | "lg";
  /** elevated=true → світліша поверхня (--pub-surface-elevated). */
  elevated?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  /** Інтерактивний ховер (для клікабельних карток). */
  interactive?: boolean;
};

const PAD = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

const ELEV = {
  none: "",
  sm: pubShadow.sm,
  md: pubShadow.md,
  lg: pubShadow.lg,
} as const;

export const PubCard = forwardRef<HTMLDivElement, PubCardProps>(function PubCard(
  {
    accent,
    elevation = "sm",
    elevated = false,
    padding = "md",
    interactive = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        "relative overflow-hidden rounded-[var(--r-2xl)] border border-[var(--pub-border)]",
        elevated ? "bg-[var(--pub-surface-elevated)]" : "bg-[var(--pub-surface)]",
        ELEV[elevation],
        accent ? cx(PAD[padding], "pl-6") : PAD[padding],
        interactive &&
          "transition-shadow duration-200 hover:shadow-[var(--pub-shadow-md)]",
        className,
      )}
      {...rest}
    >
      {accent ? (
        <span
          aria-hidden="true"
          className={cx(
            "absolute left-0 top-[18px] bottom-[18px] w-1 rounded-[var(--r-pill)]",
            pubAccentStripColor[accent],
          )}
        />
      ) : null}
      {children}
    </div>
  );
});
