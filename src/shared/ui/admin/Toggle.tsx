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
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cx(
          "relative h-[26px] w-[46px] flex-none rounded-[var(--r-pill)] transition-colors",
          checked ? "bg-[var(--cms-accent-primary)]" : "bg-[var(--cms-border-strong)]",
          "disabled:opacity-60",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
        )}
        {...aria}
      >
        <span
          className={cx(
            "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform",
            checked ? "translate-x-[23px]" : "translate-x-[3px]"
          )}
        />
      </button>
      {label && <span className="text-sm text-[var(--cms-text)]">{label}</span>}
    </label>
  );
}
