import type { ElementType, ReactNode } from "react";

type CardProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
};

export function Card({
  as: Component = "article",
  children,
  className,
}: CardProps) {
  return (
    <Component
      className={["osbb-card", className].filter(Boolean).join(" ")}
    >
      {children}
    </Component>
  );
}
