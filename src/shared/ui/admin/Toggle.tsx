"use client";

import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type ToggleProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Toggle({ checked, onCheckedChange, label, disabled, ...aria }: ToggleProps) {
  return (
    <label
      className={cx(
        "inline-flex items-center gap-3 select-none",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cx(
          "relative h-[26px] w-[46px] flex-none rounded-[var(--r-pill)] transition-colors",
          checked ? "bg-[var(--cms-accent-primary)]" : "bg-[var(--cms-border-strong)]",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]",
        )}
        {...aria}
      >
        <span
          className={cx(
            "absolute top-[3px] h-5 w-5 rounded-[var(--r-pill)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-sm)] transition-transform",
            checked ? "translate-x-[23px]" : "translate-x-[3px]",
          )}
        />
      </button>

      {label ? <span className="text-sm text-[var(--cms-text)]">{label}</span> : null}
    </label>
  );
}
