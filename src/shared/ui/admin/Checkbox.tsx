import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type CheckboxProps = {
  label?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, disabled, ...rest },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <label
      htmlFor={inputId}
      className={cx(
        "group inline-flex items-center gap-2.5 select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span className="relative inline-flex h-[22px] w-[22px] flex-none">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          className={cx(
            "peer absolute inset-0 m-0 cursor-inherit appearance-none rounded-[var(--r-sm)]",
            className,
          )}
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--r-sm)] transition-colors",
            "border-[1.5px] border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)]",
            "peer-checked:border-transparent peer-checked:bg-[var(--cms-accent-primary)]",
            "peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-[var(--cms-accent-foreground)] opacity-0 transition-opacity peer-checked:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      </span>

      {label ? <span className="text-sm text-[var(--cms-text)]">{label}</span> : null}
    </label>
  );
});
