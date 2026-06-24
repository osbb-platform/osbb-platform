import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
};

const SIZE = { sm: "h-[18px] w-[18px]", md: "h-7 w-7", lg: "h-10 w-10" } as const;

export function Spinner({ size = "md", className, ...aria }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx("animate-spin text-current", SIZE[size], className)}
      fill="none"
      role="status"
      aria-label={aria["aria-label"] ?? "Завантаження"}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
