import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type InputProps = {
  invalid?: boolean;
  iconLeft?: React.ReactNode;
  suffix?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, iconLeft, suffix, className, ...rest },
  ref,
) {
  return (
    <div className="relative flex items-center">
      {iconLeft ? (
        <span
          className="pointer-events-none absolute left-3.5 text-[var(--cms-text-soft)]"
          aria-hidden="true"
        >
          {iconLeft}
        </span>
      ) : null}

      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          "h-11 w-full rounded-[var(--r-lg)] text-sm shadow-none transition-colors",
          "bg-[var(--cms-surface-elevated)] text-[var(--cms-text)] placeholder:text-[var(--cms-text-soft)]",
          iconLeft ? "pl-10" : "pl-3.5",
          suffix ? "pr-10" : "pr-3.5",
          invalid
            ? "border border-[var(--cms-danger-border)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-danger-text)_22%,transparent)]"
            : "border border-[var(--cms-border-strong)] focus:border-[var(--cms-accent-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
          "focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...rest}
      />

      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 text-[var(--cms-text-soft)]">
          {suffix}
        </span>
      ) : null}
    </div>
  );
});
