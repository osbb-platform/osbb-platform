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
        "inline-flex min-h-[56px] items-center justify-center rounded-[20px]",
        "border border-[#D2C6B8] bg-[#E7DED3] px-7 py-3.5",
        "text-[15px] font-semibold text-[#1F2A37]",
        "shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]",
        "transition-all duration-200",
        "hover:border-[#C4B7A7] hover:bg-[#DDD1C3]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2C6B8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F2]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
