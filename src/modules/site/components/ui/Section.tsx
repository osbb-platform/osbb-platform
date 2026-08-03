import type { ElementType, ReactNode } from "react";

type SectionTone = "default" | "quiet" | "deep";

type SectionProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
  tight?: boolean;
  tone?: SectionTone;
};

export function Section({
  as: Component = "section",
  children,
  className,
  containerClassName,
  id,
  tight = false,
  tone = "default",
}: SectionProps) {
  const sectionClasses = [
    "osbb-section",
    tight && "osbb-section--tight",
    tone === "quiet" && "osbb-section--quiet",
    tone === "deep" && "osbb-section--deep",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const containerClasses = [
    "osbb-container",
    containerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={sectionClasses} id={id}>
      <div className={containerClasses}>{children}</div>
    </Component>
  );
}
