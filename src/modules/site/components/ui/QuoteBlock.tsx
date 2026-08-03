import type { ReactNode } from "react";

type QuoteBlockProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function QuoteBlock({
  children,
  footer,
}: QuoteBlockProps) {
  return (
    <blockquote className="osbb-quote">
      <div>{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </blockquote>
  );
}
