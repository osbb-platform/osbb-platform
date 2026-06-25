import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PublicDocumentActionButton({
  children,
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={[
        "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[var(--r-pill)]",
        "border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-7",
        "text-[15px] font-semibold text-[var(--pub-text)]",
        "transition-colors duration-200",
        "hover:bg-[var(--pub-bg-quiet)]",
        "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
