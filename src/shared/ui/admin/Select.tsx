import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type SelectProps = {
  invalid?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          "h-11 w-full cursor-pointer appearance-none rounded-[var(--r-lg)] pl-3.5 pr-9 text-sm shadow-none transition-colors",
          "bg-[var(--cms-surface-elevated)] text-[var(--cms-text)]",
          invalid
            ? "border border-[var(--cms-danger-border)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-danger-text)_22%,transparent)]"
            : "border border-[var(--cms-border-strong)] focus:border-[var(--cms-accent-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
          "focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...rest}
      >
        {children}
      </select>

      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cms-text-soft)]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
});
