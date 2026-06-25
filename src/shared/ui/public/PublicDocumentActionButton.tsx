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
        "inline-flex min-h-[56px] items-center justify-center rounded-[var(--r-pill)]",
        "border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] px-7 py-3.5",
        "text-[15px] font-semibold text-[var(--pub-text)]",
        "shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]",
        "transition-all duration-200",
        "hover:border-[var(--pub-accent-border)] hover:bg-[var(--pub-accent-tint)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pub-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pub-bg)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
