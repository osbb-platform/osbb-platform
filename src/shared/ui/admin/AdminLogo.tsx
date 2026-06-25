import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type AdminLogoProps = {
  variant?: "mark" | "full";
  size?: "sm" | "md" | "lg";
  tone?: "default" | "muted" | "inverse";
  className?: string;
};

const MARK_PX: Record<NonNullable<AdminLogoProps["size"]>, number> = {
  sm: 32,
  md: 44,
  lg: 64,
};

const TONE_TEXT: Record<
  NonNullable<AdminLogoProps["tone"]>,
  { main: string; sub: string }
> = {
  default: {
    main: "text-[var(--cms-text)]",
    sub: "text-[var(--cms-text-soft)]",
  },
  muted: {
    main: "text-[var(--cms-text-muted)]",
    sub: "text-[var(--cms-text-soft)]",
  },
  inverse: {
    main: "text-[var(--cms-accent-foreground)]",
    sub: "text-[var(--cms-accent-foreground)]",
  },
};

function Mark({ px }: { px: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-[28%] border border-[var(--cms-border)] bg-[var(--cms-bg)] text-[var(--cms-accent-primary)]"
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        width={px * 0.72}
        height={px * 0.72}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 23 L24 11 L39 23" />
        <path d="M13.5 23 V37.5" />
        <path d="M34.5 23 V37.5" />
        <path d="M10.5 37.5 H37.5" />
        <path d="M24 37.5 V19.5" />
        <path d="M16 29 H20" />
        <path d="M28 29 H32" />
      </svg>
    </span>
  );
}

export function AdminLogo({
  variant = "full",
  size = "md",
  tone = "default",
  className,
}: AdminLogoProps) {
  const px = MARK_PX[size];
  const text = TONE_TEXT[tone];

  if (variant === "mark") {
    return (
      <span className={cx("inline-flex", className)} role="img" aria-label="OSBB Platform">
        <Mark px={px} />
      </span>
    );
  }

  return (
    <span
      className={cx("inline-flex items-center gap-3", className)}
      role="img"
      aria-label="OSBB Platform"
    >
      <Mark px={px} />
      <span className="flex flex-col leading-[1.05]">
        <span
          className={cx(
            "font-[family-name:var(--font-serif)] font-semibold tracking-[-0.01em]",
            text.main,
          )}
          style={{ fontSize: px * 0.5 }}
        >
          OSBB
        </span>
        <span
          className={cx("font-semibold uppercase", text.sub)}
          style={{ fontSize: px * 0.25, letterSpacing: "0.08em" }}
        >
          Platform
        </span>
      </span>
    </span>
  );
}
