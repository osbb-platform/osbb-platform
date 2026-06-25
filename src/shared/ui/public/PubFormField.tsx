// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/PubFormField.tsx
// Обгортка поля: label + (опц.) підказка + повідомлення про помилку.
// Прокидає for/id зв'язок; помилка має role="alert".
// ════════════════════════════════════════════════════════════════════════
import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "./pubStyles";

export type PubFormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  /** children отримує id для зв'язку label↔control (render-prop або звичайні діти). */
  children: ReactNode | ((fieldId: string) => ReactNode);
};

export function PubFormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}: PubFormFieldProps) {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label
        htmlFor={fieldId}
        className="text-xs font-semibold text-[var(--pub-text-muted)]"
      >
        {label}
        {required ? <span className="ml-1 text-[var(--pub-danger-text)]">*</span> : null}
      </label>

      {typeof children === "function" ? children(fieldId) : children}

      {error ? (
        <div role="alert" className="text-[13px] font-medium text-[var(--pub-danger-text)]">
          {error}
        </div>
      ) : hint ? (
        <div className="text-[13px] text-[var(--pub-text-soft)]">{hint}</div>
      ) : null}
    </div>
  );
}
