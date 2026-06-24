import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type FormFieldProps = {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const descId = React.useId();

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className={cx(
          "text-sm font-semibold",
          error ? "text-[var(--cms-danger-text)]" : "text-[var(--cms-text)]",
        )}
      >
        {label}
        {required ? <span className="ml-1 text-[var(--cms-danger-text)]">*</span> : null}
      </label>

      {children}

      {error ? (
        <span id={descId} role="alert" className="text-xs font-medium text-[var(--cms-danger-text)]">
          {error}
        </span>
      ) : hint ? (
        <span id={descId} className="text-xs leading-[1.5] text-[var(--cms-text-soft)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
