import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type TextareaProps = {
  invalid?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cx(
        "w-full resize-y rounded-[var(--r-lg)] p-3 text-sm leading-[1.6] shadow-none transition-colors",
        "bg-[var(--cms-surface-elevated)] text-[var(--cms-text)] placeholder:text-[var(--cms-text-soft)]",
        invalid
          ? "border border-[var(--cms-danger-border)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-danger-text)_22%,transparent)]"
          : "border border-[var(--cms-border-strong)] focus:border-[var(--cms-accent-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
        "focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    />
  );
});
