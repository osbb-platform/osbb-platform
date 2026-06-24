import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type SkeletonProps = {
  variant?: "text" | "block" | "card" | "row";
  className?: string;
  style?: React.CSSProperties;
};

const VARIANT: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-3 w-full rounded-[6px]",
  block: "h-24 w-full rounded-[var(--r-lg)]",
  card: "h-40 w-full rounded-[var(--r-xl)]",
  row: "h-11 w-full rounded-[var(--r-md)]",
};

const SHIMMER =
  "bg-[linear-gradient(90deg,var(--cms-surface-muted)_25%,var(--cms-surface-elevated)_50%,var(--cms-surface-muted)_75%)] " +
  "bg-[length:300%_100%] animate-[osbb-shimmer_1.4s_linear_infinite] motion-reduce:animate-none";

export function Skeleton({ variant = "text", className, style }: SkeletonProps) {
  return <div aria-hidden="true" style={style} className={cx(VARIANT[variant], SHIMMER, className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3.5">
      <Skeleton variant="block" className="h-[46px] w-[46px] flex-none rounded-[var(--r-md)]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton variant="text" className="w-[70%]" />
        <Skeleton variant="text" className="w-[45%]" />
      </div>
    </div>
  );
}
