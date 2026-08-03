import Link from "next/link";

import { ROUTES } from "@/src/shared/config/routes/routes.config";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Хлібні крихти" className="osbb-crumbs">
      <div className="osbb-container">
        <ol>
          <li>
            <Link href={ROUTES.site.home}>Головна</Link>
          </li>

          {items.map((item) => (
            <li key={`${item.label}-${item.href ?? "current"}`}>
              <span aria-hidden="true">/</span>{" "}

              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
