import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type RadioProps = { label?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>;

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, id, ...rest },
  ref
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  return (
    <label htmlFor={inputId} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <span className="relative inline-flex h-5 w-5 flex-none">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className={cx("peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-full", className)}
          {...rest}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full border-2 border-[var(--cms-border-strong)] transition-colors peer-checked:border-[var(--cms-accent-primary)] peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--cms-accent-primary)] opacity-0 transition-opacity peer-checked:opacity-100" />
        </span>
      </span>
      {label && <span className="text-sm text-[var(--cms-text)]">{label}</span>}
    </label>
  );
});
